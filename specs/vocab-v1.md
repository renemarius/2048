# v1 Vocabulary List & Conjugation Pattern Groups

Referenced from `constitution.md` Section 3.1 / Open Decisions Log. This
list exists to answer: how large can v1's word list be while staying
strictly "regular" (Principle 1 — no irregular-exception lookup tables)?

Every word below was checked against the five recognized irregular
conjugation classes (ㄷ, ㅂ, ㅅ, 르, ㅎ) plus the ㅡ-contraction pattern, and
confirmed to follow **only** predictable, rule-based conjugation. None of
these need a per-word exception — they fall out of a small number of
general rules.

## Pattern groups = engine sub-rules

| Group | Rule | Engine complexity |
|---|---|---|
| **1. Batchim-final** | Stem ends in a consonant. Last vowel ㅏ/ㅗ → `-아요`/`-았어요`; anything else → `-어요`/`-었어요`. No contraction ever occurs (the consonant blocks it). | Simplest. One lookup: is last vowel ㅏ or ㅗ? |
| **2. Open vowel, same/near-vowel elision** | Stem ends directly in ㅏ, ㅓ, ㅐ, ㅔ, or ㅕ with no batchim. Adding 아/어 would double up the vowel, so it elides: 가+아요→가요, 서+어요→서요. | +1 rule: detect open ㅏ/ㅓ/ㅐ/ㅔ/ㅕ-final stem, drop the added vowel. |
| **3. Open vowel, diphthong formation** | Stem ends directly in ㅗ, ㅜ, or ㅣ with no batchim. Adding 아/어 forms a diphthong: 오+아요→와요, 배우+어요→배워요, 마시+어요→마셔요. | +1 rule: detect open ㅗ/ㅜ/ㅣ-final stem, merge into the glide form (와/워/여). |
| **4. 하다-verbs** | Stem ends in 하다. Always → `해요`/`했어요`, regardless of what precedes 하다. | Simplest possible special case — one fixed substitution, applies to unlimited noun+하다 compounds. |

**Explicitly excluded from v1** (deferred to v2 per constitution Section
3.1 / 6) — these require real per-class exception rules, not just more
sub-rules of vowel harmony:

- **ㄷ-irregular:** 듣다(hear), 걷다(walk), 묻다(ask), 싣다(load)
- **ㅂ-irregular:** 춥다(cold), 덥다(hot), 쉽다(easy), 어렵다(difficult),
  가깝다(close), 무겁다(heavy), 귀엽다(cute), 눕다(lie down), 돕다(help)
- **ㅅ-irregular:** 짓다(build), 낫다(better/cure), 붓다(pour), 젓다(stir),
  긋다(draw a line)
- **르-irregular:** 모르다(not know), 부르다(call/sing), 빠르다(fast),
  다르다(different), 고르다(choose)
- **ㅎ-irregular (descriptive):** 그렇다(be so), 빨갛다(red), 파랗다(blue),
  노랗다(yellow), 하얗다(white)
- **ㅡ-contraction:** 쓰다(write/use), 크다(big), 아프다(sick), 바쁘다(busy),
  기쁘다(happy), 고프다(hungry)

These are all common, useful A1–A2 words — this is the natural v2 backlog,
not a "these words don't matter" list. See `specs/vocab-v2.md` for how
this list is picked up as v2's Level 2 content.

---

## Group 1 — Batchim-final (27 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 먹다 | eat | 먹어요 | 먹었어요 |
| 읽다 | read | 읽어요 | 읽었어요 |
| 받다 | receive | 받아요 | 받았어요 |
| 앉다 | sit | 앉아요 | 앉았어요 |
| 웃다 | laugh/smile | 웃어요 | 웃었어요 |
| 씻다 | wash | 씻어요 | 씻었어요 |
| 신다 | wear (shoes) | 신어요 | 신었어요 |
| 입다 | wear (clothes) | 입어요 | 입었어요 |
| 놀다 | play | 놀아요 | 놀았어요 |
| 살다 | live | 살아요 | 살았어요 |
| 알다 | know | 알아요 | 알았어요 |
| 열다 | open | 열어요 | 열었어요 |
| 닫다 | close | 닫아요 | 닫았어요 |
| 믿다 | believe | 믿어요 | 믿었어요 |
| 좋다 | be good | 좋아요 | 좋았어요 |
| 많다 | be many | 많아요 | 많았어요 |
| 작다 | be small | 작아요 | 작았어요 |
| 높다 | be high | 높아요 | 높았어요 |
| 짧다 | be short | 짧아요 | 짧았어요 |
| 길다 | be long | 길어요 | 길었어요 |
| 찾다 | find/look for | 찾아요 | 찾았어요 |
| 잡다 | catch/hold | 잡아요 | 잡았어요 |
| 있다 | exist/have | 있어요 | 있었어요 |
| 없다 | not exist/not have | 없어요 | 없었어요 |
| 맞다 | be correct | 맞아요 | 맞았어요 |
| 늦다 | be late | 늦어요 | 늦었어요 |
| 싫다 | dislike | 싫어요 | 싫었어요 |

## Group 2 — Open vowel, elision (12 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 가다 | go | 가요 | 갔어요 |
| 자다 | sleep | 자요 | 잤어요 |
| 사다 | buy | 사요 | 샀어요 |
| 타다 | ride | 타요 | 탔어요 |
| 만나다 | meet | 만나요 | 만났어요 |
| 서다 | stand | 서요 | 섰어요 |
| 건너다 | cross | 건너요 | 건넜어요 |
| 켜다 | turn on | 켜요 | 켰어요 |
| 보내다 | send | 보내요 | 보냈어요 |
| 지내다 | spend time | 지내요 | 지냈어요 |
| 끝나다 | finish/end | 끝나요 | 끝났어요 |
| 일어나다 | wake up/get up | 일어나요 | 일어났어요 |

## Group 3 — Open vowel, diphthong (8 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 오다 | come | 와요 | 왔어요 |
| 보다 | see/watch | 봐요 | 봤어요 |
| 배우다 | learn | 배워요 | 배웠어요 |
| 마시다 | drink | 마셔요 | 마셨어요 |
| 다니다 | attend/commute | 다녀요 | 다녔어요 |
| 기다리다 | wait | 기다려요 | 기다렸어요 |
| 주다 | give | 줘요 | 줬어요 |
| 나오다 | come out | 나와요 | 나왔어요 |

## Group 4 — 하다-verbs (15 words)

| Word | Meaning | Present | Past |
|---|---|---|---|
| 하다 | do | 해요 | 했어요 |
| 공부하다 | study | 공부해요 | 공부했어요 |
| 운동하다 | exercise | 운동해요 | 운동했어요 |
| 일하다 | work | 일해요 | 일했어요 |
| 요리하다 | cook | 요리해요 | 요리했어요 |
| 좋아하다 | like | 좋아해요 | 좋아했어요 |
| 시작하다 | start | 시작해요 | 시작했어요 |
| 노래하다 | sing | 노래해요 | 노래했어요 |
| 전화하다 | call | 전화해요 | 전화했어요 |
| 사랑하다 | love | 사랑해요 | 사랑했어요 |
| 말하다 | speak | 말해요 | 말했어요 |
| 생각하다 | think | 생각해요 | 생각했어요 |
| 청소하다 | clean | 청소해요 | 청소했어요 |
| 숙제하다 | do homework | 숙제해요 | 숙제했어요 |
| 필요하다 | need/be necessary | 필요해요 | 필요했어요 |

**Total: 62 words**, all fully regular under 4 sub-rules (no per-word
exceptions).

---

## Scope decision this raises

The original constitution estimate (25–40 words, "vowel harmony... no
irregular stem changes") implicitly assumed only Group 1 + Group 4 —
i.e. skip vowel contraction/diphthongization entirely. That would still be
a valid, smaller v1:

- **Minimal engine** (Groups 1 + 4 only): ~42 words, one sub-rule
  (ㅏ/ㅗ vs. other), zero contraction logic. Fastest to build correctly.
  **But excludes 가다/오다/보다/배우다/마시다** — arguably the most
  fundamental verbs in the language, which would feel like a strange gap
  in a Korean-learning game.
- **Full regular engine** (Groups 1–4): 62 words, four sub-rules, still no
  exception lookup tables (every rule is exceptionless within its
  triggering condition — this is real, predictable Korean grammar, not
  guesswork). More engine surface, but each rule is small and testable in
  isolation.

Recommendation: **Full regular engine.** The extra two sub-rules
(elision, diphthong) are still deterministic pattern-matching, not
irregular-exception handling, so Principle 1 ("grammar correctness over
breadth") isn't compromised — and leaving out 가다/오다/보다 would hurt the
product more than the added engine work costs.
