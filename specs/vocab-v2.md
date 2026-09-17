# v2 Vocabulary — Level 2: Irregular Conjugation Classes

Referenced from `constitution.md`'s v2 checklist / Open Decisions Log.
Answers: what does "Level 2" actually contain, and why these specific
words?

## Scope — DECIDED

Level 2 adds the six irregular/exception conjugation classes that v1
explicitly excluded (see `specs/vocab-v1.md`'s "Explicitly excluded from
v1" list) — no new pattern groups beyond these, no additional tenses.
Level 1 (v1's 62-word regular set, present + past polite only) stays the
default/first experience; Level 2 unlocks the harder, exception-based
words on top of it, not instead of it.

## Word list (34 words, from `specs/vocab-v1.md`)

### ㄷ-irregular (4 words)

듣다 (hear), 걷다 (walk), 묻다 (ask), 싣다 (load)

### ㅂ-irregular (9 words)

춥다 (cold), 덥다 (hot), 쉽다 (easy), 어렵다 (difficult), 가깝다 (close),
무겁다 (heavy), 귀엽다 (cute), 눕다 (lie down), 돕다 (help)

### ㅅ-irregular (5 words)

짓다 (build), 낫다 (better/cure), 붓다 (pour), 젓다 (stir), 긋다 (draw a line)

### 르-irregular (5 words)

모르다 (not know), 부르다 (call/sing), 빠르다 (fast), 다르다 (different),
고르다 (choose)

### ㅎ-irregular, descriptive (5 words)

그렇다 (be so), 빨갛다 (red), 파랗다 (blue), 노랗다 (yellow), 하얗다 (white)

### ㅡ-contraction (6 words)

쓰다 (write/use), 크다 (big), 아프다 (sick), 바쁘다 (busy), 기쁘다 (happy),
고프다 (hungry)

## Engine implication — OPEN

Each class needs its own exception-handling rule in the conjugation
engine (`packages/core`), not a vowel-harmony sub-rule like v1's four
pattern groups — that's exactly why v1 (Principle 1: correctness over
breadth) deferred them. Per Principle 1 and the existing testing bar
(`specs/vocab-v1.md`, `vocab.test.ts`), each class needs exhaustive unit
tests covering every word in that class before it ships, not spot
checks. The exact per-class transformation rules (e.g. batchim
drop-and-substitute for ㄷ/ㅂ/ㅅ, vowel contraction for 르/ㅡ, stem
truncation for descriptive ㅎ) still need to be written out the way
`specs/vocab-v1.md`'s pattern-group table does for v1 — not done in this
pass, since this session locked *scope*, not the engine spec.

## Level-gating criteria — OPEN

Not yet decided: what unlocks Level 2 for a given player — completing
all 62 Level 1 words in the dictionary, a score/session threshold, or a
manual toggle available from the start? Needs a decision before
implementation starts.
