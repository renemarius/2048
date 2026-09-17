// Full v1 vocabulary — specs/vocab-v1.md. Word/meaning pairs, plus an
// example sentence per word for the dictionary panel (constitution.md
// Section 3.3 / Open Decisions Log). Each word's conjugation pattern
// group is auto-detected by conjugate() from the word's own shape, not
// stored here.
//
// exampleSentence uses the word's own present-polite form (the exact
// surface form conjugate() produces — see conjugate.test.ts) so the
// sentence reinforces the same conjugation the game just taught, not a
// dictionary-form restatement.

export interface VocabEntry {
  word: string;
  meaning: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export const VOCAB: VocabEntry[] = [
  // Group 1 — batchim-final (27)
  { word: '먹다', meaning: 'eat', exampleSentence: '저는 아침을 먹어요.', exampleTranslation: 'I eat breakfast.' },
  { word: '읽다', meaning: 'read', exampleSentence: '저는 책을 읽어요.', exampleTranslation: 'I read a book.' },
  { word: '받다', meaning: 'receive', exampleSentence: '저는 선물을 받아요.', exampleTranslation: 'I receive a gift.' },
  { word: '앉다', meaning: 'sit', exampleSentence: '저는 의자에 앉아요.', exampleTranslation: 'I sit on a chair.' },
  { word: '웃다', meaning: 'laugh/smile', exampleSentence: '아기가 웃어요.', exampleTranslation: 'The baby laughs.' },
  { word: '씻다', meaning: 'wash', exampleSentence: '저는 손을 씻어요.', exampleTranslation: 'I wash my hands.' },
  { word: '신다', meaning: 'wear (shoes)', exampleSentence: '저는 신발을 신어요.', exampleTranslation: 'I put on my shoes.' },
  { word: '입다', meaning: 'wear (clothes)', exampleSentence: '저는 옷을 입어요.', exampleTranslation: 'I put on my clothes.' },
  { word: '놀다', meaning: 'play', exampleSentence: '아이들이 공원에서 놀아요.', exampleTranslation: 'The children play in the park.' },
  { word: '살다', meaning: 'live', exampleSentence: '저는 서울에 살아요.', exampleTranslation: 'I live in Seoul.' },
  { word: '알다', meaning: 'know', exampleSentence: '저는 그 사람을 알아요.', exampleTranslation: 'I know that person.' },
  { word: '열다', meaning: 'open', exampleSentence: '저는 창문을 열어요.', exampleTranslation: 'I open the window.' },
  { word: '닫다', meaning: 'close', exampleSentence: '저는 문을 닫아요.', exampleTranslation: 'I close the door.' },
  { word: '믿다', meaning: 'believe', exampleSentence: '저는 친구를 믿어요.', exampleTranslation: 'I trust my friend.' },
  { word: '좋다', meaning: 'be good', exampleSentence: '이 노래가 좋아요.', exampleTranslation: 'This song is good.' },
  { word: '많다', meaning: 'be many', exampleSentence: '사람이 많아요.', exampleTranslation: 'There are many people.' },
  { word: '작다', meaning: 'be small', exampleSentence: '이 가방이 작아요.', exampleTranslation: 'This bag is small.' },
  { word: '높다', meaning: 'be high', exampleSentence: '저 산이 높아요.', exampleTranslation: 'That mountain is high.' },
  { word: '짧다', meaning: 'be short', exampleSentence: '제 머리가 짧아요.', exampleTranslation: 'My hair is short.' },
  { word: '길다', meaning: 'be long', exampleSentence: '이 길이 길어요.', exampleTranslation: 'This road is long.' },
  { word: '찾다', meaning: 'find/look for', exampleSentence: '저는 열쇠를 찾아요.', exampleTranslation: 'I look for my keys.' },
  { word: '잡다', meaning: 'catch/hold', exampleSentence: '저는 손을 잡아요.', exampleTranslation: 'I hold hands.' },
  { word: '있다', meaning: 'exist/have', exampleSentence: '저는 시간이 있어요.', exampleTranslation: 'I have time.' },
  { word: '없다', meaning: 'not exist/not have', exampleSentence: '저는 돈이 없어요.', exampleTranslation: "I don't have money." },
  { word: '맞다', meaning: 'be correct', exampleSentence: '그 답이 맞아요.', exampleTranslation: 'That answer is correct.' },
  { word: '늦다', meaning: 'be late', exampleSentence: '버스가 늦어요.', exampleTranslation: 'The bus is late.' },
  { word: '싫다', meaning: 'dislike', exampleSentence: '저는 그 음식이 싫어요.', exampleTranslation: 'I dislike that food.' },

  // Group 2 — open vowel, elision (12)
  { word: '가다', meaning: 'go', exampleSentence: '저는 학교에 가요.', exampleTranslation: 'I go to school.' },
  { word: '자다', meaning: 'sleep', exampleSentence: '저는 일찍 자요.', exampleTranslation: 'I sleep early.' },
  { word: '사다', meaning: 'buy', exampleSentence: '저는 과일을 사요.', exampleTranslation: 'I buy fruit.' },
  { word: '타다', meaning: 'ride', exampleSentence: '저는 버스를 타요.', exampleTranslation: 'I ride the bus.' },
  { word: '만나다', meaning: 'meet', exampleSentence: '저는 친구를 만나요.', exampleTranslation: 'I meet my friend.' },
  { word: '서다', meaning: 'stand', exampleSentence: '저는 여기에 서요.', exampleTranslation: 'I stand here.' },
  { word: '건너다', meaning: 'cross', exampleSentence: '저는 길을 건너요.', exampleTranslation: 'I cross the street.' },
  { word: '켜다', meaning: 'turn on', exampleSentence: '저는 불을 켜요.', exampleTranslation: 'I turn on the light.' },
  { word: '보내다', meaning: 'send', exampleSentence: '저는 편지를 보내요.', exampleTranslation: 'I send a letter.' },
  { word: '지내다', meaning: 'spend time', exampleSentence: '저는 잘 지내요.', exampleTranslation: "I'm doing well." },
  { word: '끝나다', meaning: 'finish/end', exampleSentence: '수업이 끝나요.', exampleTranslation: 'Class ends.' },
  { word: '일어나다', meaning: 'wake up/get up', exampleSentence: '저는 일곱 시에 일어나요.', exampleTranslation: 'I get up at seven o\'clock.' },

  // Group 3 — open vowel, diphthong (8)
  { word: '오다', meaning: 'come', exampleSentence: '친구가 우리 집에 와요.', exampleTranslation: 'My friend comes to our house.' },
  { word: '보다', meaning: 'see/watch', exampleSentence: '저는 영화를 봐요.', exampleTranslation: 'I watch a movie.' },
  { word: '배우다', meaning: 'learn', exampleSentence: '저는 한국어를 배워요.', exampleTranslation: 'I learn Korean.' },
  { word: '마시다', meaning: 'drink', exampleSentence: '저는 물을 마셔요.', exampleTranslation: 'I drink water.' },
  { word: '다니다', meaning: 'attend/commute', exampleSentence: '저는 학교에 다녀요.', exampleTranslation: 'I attend school.' },
  { word: '기다리다', meaning: 'wait', exampleSentence: '저는 버스를 기다려요.', exampleTranslation: 'I wait for the bus.' },
  { word: '주다', meaning: 'give', exampleSentence: '저는 친구에게 선물을 줘요.', exampleTranslation: 'I give my friend a gift.' },
  { word: '나오다', meaning: 'come out', exampleSentence: '저는 집에서 나와요.', exampleTranslation: 'I come out of the house.' },

  // Group 4 — 하다-verbs (15)
  { word: '하다', meaning: 'do', exampleSentence: '저는 게임을 해요.', exampleTranslation: 'I play a game.' },
  { word: '공부하다', meaning: 'study', exampleSentence: '저는 한국어를 공부해요.', exampleTranslation: 'I study Korean.' },
  { word: '운동하다', meaning: 'exercise', exampleSentence: '저는 매일 운동해요.', exampleTranslation: 'I exercise every day.' },
  { word: '일하다', meaning: 'work', exampleSentence: '저는 회사에서 일해요.', exampleTranslation: 'I work at a company.' },
  { word: '요리하다', meaning: 'cook', exampleSentence: '저는 저녁을 요리해요.', exampleTranslation: 'I cook dinner.' },
  { word: '좋아하다', meaning: 'like', exampleSentence: '저는 커피를 좋아해요.', exampleTranslation: 'I like coffee.' },
  { word: '시작하다', meaning: 'start', exampleSentence: '수업이 아홉 시에 시작해요.', exampleTranslation: 'Class starts at nine o\'clock.' },
  { word: '노래하다', meaning: 'sing', exampleSentence: '저는 노래방에서 노래해요.', exampleTranslation: 'I sing at a karaoke room.' },
  { word: '전화하다', meaning: 'call', exampleSentence: '저는 엄마한테 전화해요.', exampleTranslation: 'I call my mom.' },
  { word: '사랑하다', meaning: 'love', exampleSentence: '저는 가족을 사랑해요.', exampleTranslation: 'I love my family.' },
  { word: '말하다', meaning: 'speak', exampleSentence: '저는 한국어로 말해요.', exampleTranslation: 'I speak in Korean.' },
  { word: '생각하다', meaning: 'think', exampleSentence: '저는 당신을 생각해요.', exampleTranslation: 'I think of you.' },
  { word: '청소하다', meaning: 'clean', exampleSentence: '저는 방을 청소해요.', exampleTranslation: 'I clean my room.' },
  { word: '숙제하다', meaning: 'do homework', exampleSentence: '저는 매일 숙제해요.', exampleTranslation: 'I do homework every day.' },
  { word: '필요하다', meaning: 'need/be necessary', exampleSentence: '저는 시간이 필요해요.', exampleTranslation: 'I need time.' },
];
