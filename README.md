# Grounded Help Center

**A bilingual help center whose assistant answers only from its own articles —
and says so when they do not cover a question.**

Babak · [ai-platform-architecture](https://github.com/Babak73314/ai-platform-architecture) · [grounded-hotel-concierge](https://github.com/Babak73314/grounded-hotel-concierge)

A reader asks, in English or Turkish, *"Does the hotel concierge make
bookings?"* The assistant finds the sections of the help center that answer
it, writes an answer from those sections only, cites the section behind every
sentence — and code checks every sentence against the section it cites before
the reader sees it. Asked *"How much does the platform cost?"* or *"Which
Kubernetes version does it need?"*, it refuses: the articles do not say.

The subject of the help center is my enterprise AI platform, exactly as its
public [architecture overview](https://github.com/Babak73314/ai-platform-architecture)
describes it. That README is the only source of the 24 articles; it is pinned
in this repository, and tests hold every number, technology name and status
label in the articles to it.

## Status

| Part | State |
|---|---|
| Help center and assistant | **LOCAL** — built and tested locally and in CI; not deployed anywhere |
| Claude on Amazon Bedrock (writer) and Titan (embeddings) | Implemented, behind configuration, and tested with fakes. Live run: **NOT RUN** |
| AWS CDK stack | Type-checked, tested and synthesised in CI. Never deployed |

## What it uses

The architecture of my personal website and the question-answering assistant
built for it: a static Next.js export, an API that answers from published
content, hybrid retrieval in PostgreSQL, and a code-level check on every
answer. The retrieval and answer-check code is taken from that site; the
content — the articles, the status table, the glossary and the evaluation set
— is written for this showcase.

- **Site:** Next.js 16 (static export), React 19, TypeScript, Tailwind CSS 4; English and Turkish.
- **Retrieval:** PostgreSQL with pgvector — one SQL statement fuses vector search and full-text search by reciprocal rank.
- **Writers:** a local extractive writer (no model), or Claude on Amazon Bedrock with structured output.
- **Answer check:** deterministic rules in code (`backend/src/gate.ts`).
- **Infrastructure:** AWS CDK — S3 and CloudFront for the site, Lambda and Aurora PostgreSQL Serverless v2 for the assistant.

## Run it

Requires Node.js 22. The tests need nothing else: no database, no AWS account, no key.

```bash
git clone https://github.com/Babak73314/grounded-help-center.git
cd grounded-help-center
npm run install:all
npm run verify
```

`verify` runs lint, type-check and tests in all three packages, `cdk synth`, the
site build with its link check, and the publication guard. The backend tests
run on a real PostgreSQL with pgvector compiled to WebAssembly (PGlite).

To use the help center, start the local database (Docker) and the local server:

```bash
docker compose up -d --wait
npm run build
npm start
```

Then open `http://127.0.0.1:3000/`. On start, the server applies the database
migrations and loads the articles the build wrote (`out/help/corpus.json`).
`npm run test:e2e` runs the end-to-end and accessibility tests against it.

## How a question is answered

```
question
  ├─ router (code)        prices, support contact, accounts, release plans → declined
  │                       "is X live / deployed / a demo?"               → the status table, word for word
  └─ grounded
       ├─ named only technologies no article mentions                    → not covered
       ├─ retrieve        pgvector + full-text search, fused by rank, in the asked language
       ├─ evidence floor  fewer than half of the question's words in the top passages → not covered
       ├─ write           extractive quotes, or Claude on Bedrock (passages and question fenced as data)
       ├─ check           every sentence cited; every technology, capability, number and status
       │                  label in the passage it cites; no contact details, prices, links or markup
       └─ retry once with the broken rules named → then withheld: the articles instead
```

The answer check's rules, and what it cannot do: [docs/ANSWER-CHECK.md](docs/ANSWER-CHECK.md).

## Switching on Amazon Bedrock

With no configuration, answers are written by the extractive writer, which
quotes the retrieved sentences unchanged, and passages are embedded by a
hashing embedder. Both are deterministic and run offline. Two variables switch
each part to Bedrock, independently:

```bash
MODEL_PROVIDER=bedrock BEDROCK_MODEL_ID=<model id> \
EMBEDDING_PROVIDER=bedrock BEDROCK_EMBEDDING_MODEL_ID=<model id> \
AWS_REGION=<region> npm start
```

No model id is assumed. The CDK stack takes the same choice from its context
(`-c modelProvider=bedrock -c bedrockModelId=…`) and grants the functions
access to the named models only. [docs/DEPLOYING.md](docs/DEPLOYING.md)
describes the stack and how it would be deployed.

## Evaluation

27 questions, each in English and Turkish: 20 that the articles answer, with
the article each answer must cite; 6 that they cannot answer, where the only
correct result is a refusal; and 1 instruction injection. Every case goes
through the same code path as the API.

It measures whether an answerable question is answered from the right
article, whether an unanswerable one is refused, and whether the injection is
held. It does not grade wording, and it does not measure a language model.

Current result, with the local writer and embedder (run in CI on every push):

| Measure | Result |
|---|---|
| Answerable cases answered from the right article | **39 of 40** |
| Unanswerable cases refused | **12 of 12** |
| Injection cases held | **2 of 2** |

The miss, and how to run it: [docs/EVALUATION.md](docs/EVALUATION.md). The
same set against Claude on Bedrock (`live.test.ts`) has not been run.

## What came from my site, and what was written here

| Part | Origin |
|---|---|
| `backend/src/db/sql.ts`, `db/data-api.ts`, `db/migrate.ts`, `ratelimit.ts` | From the site, unchanged but for one lock name |
| `backend/src/retrieval.ts` | From the site; the keyword half now matches word stems as prefixes and weights section titles |
| `backend/src/ingest.ts`, `corpus.ts` | From the site; the corpus shape is new, and the embedder is part of each passage's hash |
| `backend/src/gate.ts` | From the site; site-specific rules replaced by the status-label, capability, contact and price rules |
| `backend/src/text.ts` | From the site; word stems added, and the Turkish-letter check corrected |
| `backend/src/models/bedrock.ts`, `models/prompt.ts`, `embeddings/titan.ts` | From the site; the prompt rewritten for a help center, the clients injectable for tests |
| `backend/src/answers.ts`, `router.ts`, `api.ts`, `handlers/` | Adapted: new routes (out of scope, status), no contact form |
| `backend/src/embeddings/hashing.ts` | From a test helper of the site, now the local embedder |
| `src/components/ask-assistant.tsx`, `src/lib/api-client.ts`, `src/i18n/config.ts` | From the site, adapted |
| `infra/lib/assistant.ts`, `help-center-stack.ts`, `viewer-request.js` | From the site, adapted: no deploy role, budget or e-mail; Bedrock only when configured; no account-specific values |
| Evidence floor, extractive writer, vocabulary, PostgreSQL client, local server | Written here |
| The 24 articles, the status table, the glossary, the pinned overview | Written here, from the architecture overview |
| Evaluation set, provenance tests, publication guard, CI | Written here |

## Repository

```
src/
  content/articles/   24 articles as { en, tr } pairs
  content/status.ts   the overview's delivery-status table, row by row
  content/glossary.ts the technology names the answer check verifies
  content/source/     the pinned architecture overview, with its commit and hash
  app/, components/   the site: articles, the Ask page, both languages
backend/
  src/                router, retrieval, evidence floor, writers, answer check, API, Lambda handlers, local server
  test/, eval/        unit tests on PGlite, the evaluation set
infra/                AWS CDK stack and its tests
scripts/              build-output check, publication guard
docs/                 the answer check, the evaluation, deploying
```

## What is not claimed

The help center is not deployed and has no users. No language model has
answered a question in this repository: the Bedrock code is tested against
fakes only. The answer check makes inventions of technologies, numbers,
statuses and contact details impossible to deliver; it cannot prove that a
sentence reads its source correctly. The evaluation result is a measurement of
these 54 cases with the local writer, not a measure of answer quality in
general.

I develop with AI coding tools under my own review and remain responsible for
the architecture, the code quality and every decision.

## Licence

Copyright (c) 2026 Babak. All rights reserved. The code may be read, cloned,
built and run locally to evaluate the author's work; see [LICENSE](LICENSE).
