# The answer check

Every answer a writer drafts — the local extractive writer or Claude on Amazon
Bedrock — goes through `backend/src/gate.ts` before anyone reads it. The check
is code, not a model: it does not ask whether an answer is good, it checks the
things that can be checked.

| Rule | A sentence is refused when… |
|---|---|
| `uncited-sentence` | it cites no passage (`[n]`) |
| `unknown-source` | it cites a passage number the writer was not given |
| `unsupported-term` | it names a technology (from `src/content/glossary.ts`) that the passages it cites do not name |
| `unsupported-capability` | it names an application or capability that the passages it cites do not name |
| `unsupported-number` | it states a number, year or count that the passages it cites do not state |
| `status-mismatch` | a status label (LIVE, DEMO, LOCAL, OFF BY DEFAULT) is not the label the delivery-status table gives the capability named nearest before it |
| `contact-details` | it contains an e-mail address or a telephone number |
| `price-or-guarantee` | it states a price, fee, discount or guarantee |
| `markup` | it contains a link, HTML or Markdown |
| `language` | it is written in the other language |
| `length`, `empty` | it is empty, or longer than 1,500 characters or 8 sentences |

The glossary lists the technologies the architecture overview names and also
ones it never names (Kubernetes, AWS, PostgreSQL, React, …). A sentence that
names one of the second kind can never pass, because no passage names it; a
question that names only those is refused before retrieval.

## What happens when a draft fails

1. The writer is asked once more, and told which rules broke — never shown the
   refused text.
2. If the second draft fails too, nothing the writer wrote is shown. The reader
   gets the most relevant articles instead (`withheld`).

A refusal by the model itself (`stop_reason: refusal`) is withheld at once,
without a second attempt.

## Before any writer is called

- **Out of scope, by code.** Questions about prices, support channels, account
  actions or release plans are declined by `backend/src/router.ts`; the
  articles do not cover them by design.
- **Status, by code.** "Is X live / deployed / a demo?" is answered from the
  delivery-status table, word for word, each sentence citing its row. These
  answers pass the same check (a test holds every one of them to it).
- **The evidence floor.** Vector search always returns its nearest passages,
  even for a question the articles know nothing about. So
  `backend/src/evidence.ts` checks that at least half of the question's own
  words (as stems, so Turkish and English endings still match) occur in the
  top three passages. Below that, the question is refused and no writer is
  called.

## What it cannot do

It cannot prove that an answer is true. A sentence can cite the right passage,
use only its words and numbers, and still misread it. The check blocks the
cheap failures — an invented technology, number, status or contact detail, an
uncited claim — when they match the glossary and the rules above, and names the
rule that broke. A technology name missing from the glossary would pass
unnoticed.

The articles are held to the same rules: a test runs the status check over
every sentence of every article, and the provenance tests hold every number
and technology name in them to the pinned architecture overview.
