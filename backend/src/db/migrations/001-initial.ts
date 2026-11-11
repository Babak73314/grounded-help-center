/**
 * The initial schema. A migration is never edited after it has been applied:
 * the runner stores each one's checksum and refuses to start when an applied
 * migration's text has changed. A change is a new numbered file.
 */
export const sql = `
CREATE EXTENSION IF NOT EXISTS vector;

-- Values generated once, inside the database, never in code or configuration.
CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('rate_key_salt', md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text))
ON CONFLICT (key) DO NOTHING;

-- The structured facts of the published help center (capabilities, statuses, glossary), for the code-written answers.
CREATE TABLE help_facts (
  id smallint PRIMARY KEY CHECK (id = 1),
  corpus_hash text NOT NULL,
  facts jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Every section of every article, in each language, with its embedding.
-- The search columns hold the text folded for search (case and accents), so "cozum" finds "çözüm";
-- the title is weighted above the body.
CREATE TABLE content_chunks (
  id text PRIMARY KEY,
  locale text NOT NULL CHECK (locale IN ('en', 'tr')),
  article text NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  search_title text NOT NULL,
  search_body text NOT NULL,
  content_hash text NOT NULL,
  embedder text NOT NULL,
  embedding vector(1024) NOT NULL,
  search tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', search_title), 'A') || setweight(to_tsvector('simple', search_body), 'B')
  ) STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX content_chunks_search_idx ON content_chunks USING gin (search);

CREATE INDEX content_chunks_embedding_idx ON content_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX content_chunks_locale_idx ON content_chunks (locale);

-- Fixed-window counters: one row per bucket, hashed caller and window.
CREATE TABLE rate_limits (
  bucket text NOT NULL,
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (bucket, key, window_start)
);

CREATE INDEX rate_limits_window_idx ON rate_limits (window_start);

-- One row per question: how it was answered, never what was asked.
CREATE TABLE ask_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  locale text NOT NULL CHECK (locale IN ('en', 'tr')),
  route text NOT NULL,
  outcome text NOT NULL,
  writer text,
  attempts smallint NOT NULL DEFAULT 0,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer NOT NULL,
  gate_failures text
);

CREATE INDEX ask_events_created_idx ON ask_events (created_at);
`;
