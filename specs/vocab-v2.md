# v2 Vocabulary — Level 2: Irregular Conjugation Classes

Referenced from `constitution.md`'s v2 checklist / Open Decisions Log.
Answers: what does "Level 2" actually contain, why these specific words,
exactly how each class conjugates, and what unlocks it.

## Scope — DECIDED

Level 2 adds the six irregular/exception conjugation classes that v1
explicitly excluded (see `specs/vocab-v1.md`'s "Explicitly excluded from
v1" list) — no new pattern groups beyond these, no additional tenses.
Level 1 (v1's 62-word regular set, present + past polite only) stays the
default/first experience; Level 2 unlocks the harder, exception-based
words on top of it, not instead of it.

## Level-gating criteria — DECIDED

Level 2 stays locked until every one of Level 1's 62 words has reached
past-stage at least once in the permanent dictionary — full completion,
not a partial threshold. Matches Principle 5 ("ship the loop before the
polish"): mastering the regular patterns gates the exception-based ones,
rather than mixing regular and irregular stems into the active pool
before the regular patterns are solid.

## Why these can't be general phonological rules

Every class below is a **closed, per-word exception list**, not a
predictable sound-based rule — the same batchim/vowel shape can go either
way depending on the specific word, which is exactly why v1 (Principle 1)
deferred them instead of trying to detect them structurally:

- Not every ㄷ-final stem is irregular: 듣다(hear)/걷다(walk)/묻다(ask)/
  싣다(load) change ㄷ→ㄹ, but v1's own 받다(receive)/닫다(close)/믿다
  (believe) stay regular (받아요, not 발아요).
- Not every ㅎ-final stem is irregular: the five descriptive words below
  drop ㅎ and merge the vowel to ㅐ/ㅒ, but v1's own 좋다(be good) stays
  fully regular (좋아요, not 조아요/조애요).

So the engine can't infer irregularity from stem shape alone — each of
the 34 words below must be tagged with which irregular class it belongs
to (a lookup, the same way `packages/core`'s vocab table already tags
each word with its v1 pattern group), and the engine applies that class's
transformation instead of the default vowel-harmony rules.

## Classes = engine sub-rules

| Class | Transformation | Engine complexity |
|---|---|---|
| **ㄷ-irregular** | Stem-final ㄷ → ㄹ, *then* apply the normal batchim-final rule (v1 Group 1: last vowel ㅏ/ㅗ → 아, else → 어) to the new ㄹ-final stem. | Consonant substitution before an existing rule — reuses Group 1's vowel-choice logic. |
| **ㅂ-irregular** | Drop the ㅂ batchim, insert 우, contract 우+어 → 워 (present) / 우+었 → 웠 (past). **Exception:** 돕다 uses 오/와 instead of 우/워 (도와요/도왔어요) — a lexicalized exception *within* the exception class, must be special-cased by word, not derived. | Batchim drop + vowel insertion + contraction, plus one hard-coded sub-exception. |
| **ㅅ-irregular** | Drop the ㅅ batchim entirely (no substitution), then attach 아/어(요) as a **separate syllable** per normal vowel harmony on the stem's remaining vowel — no contraction (짓다 → 지어요, not 져요). | Batchim drop only; must *not* reuse Group 3's diphthong-contraction logic even though the resulting open-vowel stem looks eligible for it. |
| **르-irregular** | Split off the 르 syllable. Double its ㄹ onto the *preceding* syllable's batchim, then attach 라(요)/랐(어요) if that preceding syllable's vowel is ㅏ/ㅗ, else 러(요)/렀(어요). | Syllable-boundary lookup (needs the syllable *before* the last one) + doubling — the one class that inspects more than the final syllable. |
| **ㅎ-irregular (descriptive)** | Drop the ㅎ batchim *and* merge the final vowel to ㅐ (from ㅏ or ㅓ) or ㅒ (from ㅑ), fusing directly into one syllable with no separate 아/어 — 그렇다 → 그래요, not 그러애요. Past adds ㅆ어요 to the merged syllable. | Combined batchim-drop + vowel-merge in one step; only applies to this closed list of descriptive words, never to 좋다 or other regular ㅎ-final stems. |
| **ㅡ-contraction** | Stem ends in open ㅡ with no batchim. Drop ㅡ and fuse the vowel directly onto the remaining consonant. Vowel choice (아 vs 어) comes from the *preceding* syllable's vowel (ㅏ/ㅗ → 아, else → 어); a single-syllable stem (쓰다, 크다) defaults to 어. | Look-behind vowel harmony (same "inspect the syllable before" need as 르) + direct fusion (like Group 3's diphthong contraction, but the lookahead vowel comes from behind, not from the dropped vowel itself). |

## Full word list with present/past forms (34 words)

### ㄷ-irregular (4 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 듣다 | hear | 들어요 | 들었어요 |
| 걷다 | walk | 걸어요 | 걸었어요 |
| 묻다 | ask | 물어요 | 물었어요 |
| 싣다 | load | 실어요 | 실었어요 |

### ㅂ-irregular (9 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 춥다 | cold | 추워요 | 추웠어요 |
| 덥다 | hot | 더워요 | 더웠어요 |
| 쉽다 | easy | 쉬워요 | 쉬웠어요 |
| 어렵다 | difficult | 어려워요 | 어려웠어요 |
| 가깝다 | close | 가까워요 | 가까웠어요 |
| 무겁다 | heavy | 무거워요 | 무거웠어요 |
| 귀엽다 | cute | 귀여워요 | 귀여웠어요 |
| 눕다 | lie down | 누워요 | 누웠어요 |
| 돕다 | help | 도와요 | 도왔어요 |

### ㅅ-irregular (5 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 짓다 | build | 지어요 | 지었어요 |
| 낫다 | better/cure | 나아요 | 나았어요 |
| 붓다 | pour | 부어요 | 부었어요 |
| 젓다 | stir | 저어요 | 저었어요 |
| 긋다 | draw a line | 그어요 | 그었어요 |

### 르-irregular (5 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 모르다 | not know | 몰라요 | 몰랐어요 |
| 부르다 | call/sing | 불러요 | 불렀어요 |
| 빠르다 | fast | 빨라요 | 빨랐어요 |
| 다르다 | different | 달라요 | 달랐어요 |
| 고르다 | choose | 골라요 | 골랐어요 |

### ㅎ-irregular, descriptive (5 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 그렇다 | be so | 그래요 | 그랬어요 |
| 빨갛다 | red | 빨개요 | 빨갰어요 |
| 파랗다 | blue | 파래요 | 파랬어요 |
| 노랗다 | yellow | 노래요 | 노랬어요 |
| 하얗다 | white | 하얘요 | 하얬어요 |

### ㅡ-contraction (6 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 쓰다 | write/use | 써요 | 썼어요 |
| 크다 | big | 커요 | 컸어요 |
| 아프다 | sick | 아파요 | 아팠어요 |
| 바쁘다 | busy | 바빠요 | 바빴어요 |
| 기쁘다 | happy | 기뻐요 | 기뻤어요 |
| 고프다 | hungry | 고파요 | 고팠어요 |

**Total: 34 words** across 6 irregular classes, on top of v1's 62 regular
words — 96 words once Level 2 ships.

## Implementation note

Per the existing testing bar (`specs/vocab-v1.md`, `vocab.test.ts`), every
word above needs a unit test asserting the engine's actual `conjugate()`
output matches the table — exhaustively, not spot checks, same as v1's
75 conjugation tests covering all 62 words. Given the closed-list nature
of these classes (especially the 돕다 sub-exception and the ㅎ-class's
vowel merge), tests should assert each word individually rather than
looping generically over "all ㅂ-irregulars," so a wrong entry in this
table or a mis-tagged word fails loudly at the specific word, not as a
vague aggregate failure.
