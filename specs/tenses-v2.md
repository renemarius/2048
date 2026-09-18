# v2 Additional Tenses — Level 3: Future Tense

Referenced from `constitution.md`'s v2 checklist (`Additional tenses/endings`)
and Open Decisions Log. **Naming note:** "Level 3" here is a content-difficulty
tier, parallel to Level 1 (v1's 62 regular words) and Level 2 (the 34
irregular-class words, `specs/vocab-v2.md`) — it is **not** the same axis as
the roadmap's "v3" milestone (constitution Section 7's Personalization &
polish: themes, mobile, accounts, leaderboards). The two numberings diverge
here: Level 3 ships as part of the **v2** roadmap milestone.

## Scope — DECIDED

Level 3 adds one new ending type, **future tense**, applied across the
entire existing vocabulary (Level 1's 62 regular words + Level 2's 34
irregular words) — no new words. This is the inverse of what Level 2 did:
Level 2 added new *vocabulary* under the existing present/past endings;
Level 3 adds a new *ending* over the existing vocabulary.

**Connective endings (연결어미) are explicitly out of scope**, for Level 3
and for v2 generally. Present/past/future are all 종결어미 (sentence-final
endings) — a stem + one of them is a complete, mergeable word, which is
this project's entire merge model. Connectives (-고, -아서/어서, -지만,
-(으)면, -는데, etc.) don't end a sentence — they link two clauses, so a
stem + connective is a grammatically incomplete fragment. Supporting them
would need a different mechanic entirely (e.g. a 3-tile clause+connective+
clause merge), not an extra `EndingTile.tense` value. Tracked as a
separate, later backlog item — not bundled with Level 3.

## Merge model — DECIDED

Future is grammatically independent of past — 갈 거예요 (future) isn't
derived from 갔어요 (past) the way the current UI might suggest, since both
present and past currently *chain* (stem → present word → past word).
Future attaches directly to the bare stem, same as present does. Resolved
this session (Open Decisions Log): future is a **parallel branch off the
stem**, not a third link after past:

- `stem + future-ending → word tile (future stage)`, merging directly from
  a stem tile exactly like the existing `stem + present-ending` merge
  (`board.ts`'s `mergeLineWithBlocks`/merge-pair logic).
- Reaching future stage **retires the word** (`completedWord` is set) the
  same as reaching past stage does today — a word is now retired the
  first time it reaches **either** past **or** future, whichever the
  player happens to merge first. It does not need to reach both.
- Once retired via future, the word behaves exactly like a past-retired
  word for every downstream system: added to the permanent dictionary
  (`+50` one-time bonus) if this is the first time ever, eligible for
  spaced-review resurfacing (`pool.ts`'s `pickReviewWord`), and a review
  completion (via either past or future) increments mastery count without
  re-awarding the bonus.
- **Scoring:** `stem + future-ending → word (future)` awards **+30**, not
  +10. Reasoning: the present→past route sums to 10 + 20 = 30 to retire a
  word; future retires a word in one merge, so it's priced at the same
  total value as the two-step route rather than undercutting it as a
  "cheaper" path. (Constitution Section 3.3's scoring table gets a new row
  for this.)
- A present-stage word tile does **not** accept a future-ending (no
  `word(present) + future-ending` merge) — future only ever merges from a
  bare stem, matching how present-only-from-stem already works. A
  past-stage word tile still accepts nothing further, unchanged.

## Unlock gate — DECIDED

Mirrors Level 2's gating pattern (`specs/vocab-v2.md`): future-tense
endings stay **out of the spawn pool** (`analyzeBoardNeeds` in
`board.ts`) until every Level 1 **and** Level 2 word (96 words total, or
however many levels are unlocked at the time) has reached past-stage **or**
future-stage at least once in the permanent dictionary. On unlock, a toast
announces it, same UX as Level 2's unlock — and future endings begin
mixing into the demand-driven spawn logic (a new `futureEndingDeficit`,
analogous to `presentEndingDeficit`/`pastEndingDeficit`) for every pool
word regardless of which vocab level it belongs to.

## Grammar — future tense (-(으)ㄹ 거예요)

The standard A1–A2 form (not -겠어요, which is more formal/intention-flavored
and out of scope). Base rule: open-vowel stem → `+ ㄹ 거예요`; batchim-final
stem → `+ 을 거예요`. Unlike present/past, future needs **no vowel-harmony
choice at all** (no 아/어 split) — only a batchim/no-batchim check. This
makes future *simpler* than present/past for most words, but it also
surfaces irregularities that present/past never had to care about, because
several irregular classes behave differently before this consonant-cluster
ending than they do before 아/어. Verified against standard Korean-grammar
references (not derived from the existing 아/어-tense code by assumption),
since Principle 1 requires per-class, per-word verification the same way
`specs/vocab-v2.md` did for Level 2. **Every rule below needs to land as an
exhaustive per-word test the same way Level 2's 34 words did — this table
is the source of truth for those tests, not a paraphrase to re-derive
from.**

| Class | Future rule | Reuses existing logic? |
|---|---|---|
| **Group 1 — batchim-final** (regular) | stem + **을 거예요** | New: needs its own future function, but no vowel-harmony branch (simpler than present/past) |
| **Group 1 — native ㄹ-batchim** (놀다/살다/알다/열다/길다 *only*) | stem + **거예요** (no 을, no extra ㄹ — the stem's own batchim ㄹ already satisfies the ending) | **New closed-list exception** — v1 never needed to distinguish these from other batchim-final words, because 아/어 endings don't care. Future does. |
| **Group 2 — open elision** | stem + **ㄹ 거예요** (elision doesn't apply — that's 아/어-specific) | New but trivial: no transformation, just concatenate |
| **Group 3 — open diphthong** | stem + **ㄹ 거예요** (no diphthong fusion — 아/어-specific) | New but trivial |
| **Group 4 — 하다** | 하 + **ㄹ 거예요** → `할 거예요` | New but trivial (하 is just an open-vowel stem here) |
| **ㄷ-irregular** | Swap ㄷ→ㄹ (same swap as present/past), then **을 거예요** — the *derived* ㄹ is **not** deleted the way a *native* ㄹ-batchim stem's is. 듣다→**들을 거예요**, 걸다→**걸을 거예요**\*, 묻다→**물을 거예요**, 싣다→**실을 거예요**. | Reuses the ㄷ→ㄹ swap; then falls into the plain batchim-final future rule (not the native-ㄹ exception above) |
| **ㅂ-irregular** | Drop ㅂ, insert **우** (always — 돕다's 오/와 exception does **not** apply to future, confirmed against reference sources), then **ㄹ 거예요** on the resulting open stem: 춥다→**추울 거예요**, 돕다→**도울 거예요** | New: the present/past 워-contraction function can't be reused as-is, but the drop+insert step is shared logic |
| **ㅅ-irregular** | Drop ㅅ, but then treat the result as if it still had a batchim: **을 거예요**, not ㄹ 거예요 — 짓다→**지을 거예요**, not 질 거예요. This is the one class where the "open stem → ㄹ 거예요" rule from every other class does **not** apply. | New, and the trickiest one — flag for extra scrutiny in tests |
| **르-irregular** | No special handling at all — 르 has no batchim, so it's a plain open-vowel stem: 모르다→**모를 거예요**, 부르다→**부를 거예요**. The 르-doubling rule is 아/어-specific and never triggers here. | Fully regular — don't route through `conjugateLeuIrregular`'s doubling logic for future |
| **ㅎ-irregular (descriptive)** | Drop ㅎ, but **no** ㅐ/ㅒ vowel merge (that fusion is 아/어-specific) — just attach **ㄹ 거예요** to the open stem: 그렇다→**그럴 거예요**, 빨갛다→**빨갈 거예요** | New: can't reuse the present/past vowel-merge function, only the ㅎ-drop step |
| **ㅡ-contraction** | No drop, no fusion at all — the ㅡ stays exactly as-is, then **ㄹ 거예요**: 쓰다→**쓸 거예요**, 크다→**클 거예요** | Fully regular — don't route through the contraction logic for future |

\* 걷다 (walk) → 걸을 거예요, not 걸다's own word (unrelated coincidence that
the derived stem looks like a different verb's dictionary form — same
false-friend risk `specs/vocab-v2.md` already calls out for shape-based
guessing, another reason this needs per-word tests, not a generic loop).

### Net effect for implementation

Only **two** classes need genuinely new, non-trivial logic beyond "drop
the marked consonant, then apply the batchim/no-batchim ㄹ-vs-을 choice":
**native ㄹ-batchim words** (a new 5-word closed list, not derivable from
any existing tag) and **ㅅ-irregular** (breaks the batchim/no-batchim
pattern outright — stays 을 거예요 despite ending open). ㄷ, ㅂ, and ㅎ each
reuse their existing drop/swap step but need a distinct future-specific
tail (no vowel-harmony choice, no contraction, no vowel merge). 르 and
ㅡ-contraction need **no special-casing at all** for future — they're
fully regular once you know they have no batchim.

## Implementation notes

- `packages/core/src/types.ts`: `ConjugationStage` becomes
  `'present' | 'past' | 'future'`. `conjugate.ts`'s `Tense` type likewise.
- `packages/core/src/conjugate.ts`: needs a future-specific function per
  the table above (can't reuse the present/past functions directly, since
  the transformation differs — see "Reuses existing logic?" column), plus
  the new `NATIVE_L_FINAL_WORDS` closed-list lookup.
- `packages/core/src/board.ts`: merge-pair logic gets a
  `stem + future-ending → word(future), completedWord set` branch,
  parallel to the existing present-ending branch, not chained after
  past. `analyzeBoardNeeds` gets a `futureEndingDeficit` (stems minus
  present-ending-count minus future-ending-count, since both endings
  compete for the same stem supply — see the `pastEndingDeficit` model
  it's parallel to, but note it shares its source pool with present
  rather than having an independent one).
- `packages/core/src/pool.ts`: `advancePool`'s definition of "completed"
  already just receives a list of completed words from the caller
  (`board.ts`), so no change needed there — `board.ts` is what decides a
  merge counts as completion, and it now needs to say so for future too.
- Constitution Section 3.3 scoring table: add the future-tense row (+30).
- UI: rules panel and ending-tile rendering need a future-tense label
  (미래, or similar) alongside the existing 현재/과거 labels; dictionary
  panel likely wants to show *which* route (past or future) a word was
  actually mastered through, though that's a UI-polish call, not decided
  here.
- Every row of the table above needs an exhaustive per-word unit test
  (all 96 words × future), same rigor as Level 2's 34-word suite in
  `vocab.test.ts`/`conjugate.test.ts` — no generic "loop over all ㅂ words"
  shortcuts, per the ㅅ-irregular and native-ㄹ traps this table documents.
