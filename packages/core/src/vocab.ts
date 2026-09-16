// Full v1 vocabulary — specs/vocab-v1.md. Word/meaning pairs only; each
// word's conjugation pattern group is auto-detected by conjugate() from
// the word's own shape, not stored here.

export interface VocabEntry {
  word: string;
  meaning: string;
}

export const VOCAB: VocabEntry[] = [
  // Group 1 — batchim-final (27)
  { word: '먹다', meaning: 'eat' },
  { word: '읽다', meaning: 'read' },
  { word: '받다', meaning: 'receive' },
  { word: '앉다', meaning: 'sit' },
  { word: '웃다', meaning: 'laugh/smile' },
  { word: '씻다', meaning: 'wash' },
  { word: '신다', meaning: 'wear (shoes)' },
  { word: '입다', meaning: 'wear (clothes)' },
  { word: '놀다', meaning: 'play' },
  { word: '살다', meaning: 'live' },
  { word: '알다', meaning: 'know' },
  { word: '열다', meaning: 'open' },
  { word: '닫다', meaning: 'close' },
  { word: '믿다', meaning: 'believe' },
  { word: '좋다', meaning: 'be good' },
  { word: '많다', meaning: 'be many' },
  { word: '작다', meaning: 'be small' },
  { word: '높다', meaning: 'be high' },
  { word: '짧다', meaning: 'be short' },
  { word: '길다', meaning: 'be long' },
  { word: '찾다', meaning: 'find/look for' },
  { word: '잡다', meaning: 'catch/hold' },
  { word: '있다', meaning: 'exist/have' },
  { word: '없다', meaning: 'not exist/not have' },
  { word: '맞다', meaning: 'be correct' },
  { word: '늦다', meaning: 'be late' },
  { word: '싫다', meaning: 'dislike' },

  // Group 2 — open vowel, elision (12)
  { word: '가다', meaning: 'go' },
  { word: '자다', meaning: 'sleep' },
  { word: '사다', meaning: 'buy' },
  { word: '타다', meaning: 'ride' },
  { word: '만나다', meaning: 'meet' },
  { word: '서다', meaning: 'stand' },
  { word: '건너다', meaning: 'cross' },
  { word: '켜다', meaning: 'turn on' },
  { word: '보내다', meaning: 'send' },
  { word: '지내다', meaning: 'spend time' },
  { word: '끝나다', meaning: 'finish/end' },
  { word: '일어나다', meaning: 'wake up/get up' },

  // Group 3 — open vowel, diphthong (8)
  { word: '오다', meaning: 'come' },
  { word: '보다', meaning: 'see/watch' },
  { word: '배우다', meaning: 'learn' },
  { word: '마시다', meaning: 'drink' },
  { word: '다니다', meaning: 'attend/commute' },
  { word: '기다리다', meaning: 'wait' },
  { word: '주다', meaning: 'give' },
  { word: '나오다', meaning: 'come out' },

  // Group 4 — 하다-verbs (15)
  { word: '하다', meaning: 'do' },
  { word: '공부하다', meaning: 'study' },
  { word: '운동하다', meaning: 'exercise' },
  { word: '일하다', meaning: 'work' },
  { word: '요리하다', meaning: 'cook' },
  { word: '좋아하다', meaning: 'like' },
  { word: '시작하다', meaning: 'start' },
  { word: '노래하다', meaning: 'sing' },
  { word: '전화하다', meaning: 'call' },
  { word: '사랑하다', meaning: 'love' },
  { word: '말하다', meaning: 'speak' },
  { word: '생각하다', meaning: 'think' },
  { word: '청소하다', meaning: 'clean' },
  { word: '숙제하다', meaning: 'do homework' },
  { word: '필요하다', meaning: 'need/be necessary' },
];
