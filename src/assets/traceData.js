// 자음, 모음, 숫자 데이터 세트
export const TRACE_CATEGORIES = {
  ALL: 'all',
  CONSONANT: 'consonant',
  VOWEL: 'vowel',
  NUMBER: 'number'
};

export const TRACE_ITEMS = [
  // 자음
  { id: 'c1', char: 'ㄱ', type: TRACE_CATEGORIES.CONSONANT, color: '#FF7675', word: '기차 🚂' },
  { id: 'c2', char: 'ㄴ', type: TRACE_CATEGORIES.CONSONANT, color: '#74B9FF', word: '나비 🦋' },
  { id: 'c3', char: 'ㄷ', type: TRACE_CATEGORIES.CONSONANT, color: '#55EFC4', word: '다람쥐 🐿️' },
  { id: 'c4', char: 'ㄹ', type: TRACE_CATEGORIES.CONSONANT, color: '#FDCB6E', word: '라디오 📻' },
  { id: 'c5', char: 'ㅁ', type: TRACE_CATEGORIES.CONSONANT, color: '#A29BFE', word: '모자 👒' },
  { id: 'c6', char: 'ㅂ', type: TRACE_CATEGORIES.CONSONANT, color: '#FF9FF3', word: '바나나 🍌' },
  { id: 'c7', char: 'ㅅ', type: TRACE_CATEGORIES.CONSONANT, color: '#00CEC9', word: '사자 🦁' },
  { id: 'c8', char: 'ㅇ', type: TRACE_CATEGORIES.CONSONANT, color: '#FAB1A0', word: '오리 🦆' },
  { id: 'c9', char: 'ㅈ', type: TRACE_CATEGORIES.CONSONANT, color: '#E17055', word: '자동차 🚗' },
  { id: 'c10', char: 'ㅊ', type: TRACE_CATEGORIES.CONSONANT, color: '#0984E3', word: '치즈 🧀' },
  { id: 'c11', char: 'ㅋ', type: TRACE_CATEGORIES.CONSONANT, color: '#6C5CE7', word: '코끼리 🐘' },
  { id: 'c12', char: 'ㅌ', type: TRACE_CATEGORIES.CONSONANT, color: '#FD79A8', word: '토끼 🐰' },
  { id: 'c13', char: 'ㅍ', type: TRACE_CATEGORIES.CONSONANT, color: '#00B894', word: '포도 🍇' },
  { id: 'c14', char: 'ㅎ', type: TRACE_CATEGORIES.CONSONANT, color: '#FFA801', word: '하마 🦛' },

  // 모음
  { id: 'v1', char: '아', type: TRACE_CATEGORIES.VOWEL, color: '#FF7675', word: '아기 👶' },
  { id: 'v2', char: '야', type: TRACE_CATEGORIES.VOWEL, color: '#FFA801', word: '야옹이 🐱' },
  { id: 'v3', char: '어', type: TRACE_CATEGORIES.VOWEL, color: '#FDCB6E', word: '어머니 👩' },
  { id: 'v4', char: '여', type: TRACE_CATEGORIES.VOWEL, color: '#2ED573', word: '여우 🦊' },
  { id: 'v5', char: '오', type: TRACE_CATEGORIES.VOWEL, color: '#55EFC4', word: '오이 🥒' },
  { id: 'v6', char: '요', type: TRACE_CATEGORIES.VOWEL, color: '#74B9FF', word: '요리사 👨‍🍳' },
  { id: 'v7', char: '우', type: TRACE_CATEGORIES.VOWEL, color: '#0984E3', word: '우산 ☂️' },
  { id: 'v8', char: '유', type: TRACE_CATEGORIES.VOWEL, color: '#A29BFE', word: '유치원 🏫' },
  { id: 'v9', char: '으', type: TRACE_CATEGORIES.VOWEL, color: '#6C5CE7', word: '으라차차 💪' },
  { id: 'v10', char: '이', type: TRACE_CATEGORIES.VOWEL, color: '#FF9FF3', word: '인형 🧸' },

  // 숫자 (1 ~ 10)
  { id: 'n1', char: '1', type: TRACE_CATEGORIES.NUMBER, color: '#FF4757', word: '하나 🍎' },
  { id: 'n2', char: '2', type: TRACE_CATEGORIES.NUMBER, color: '#FFA502', word: '둘 🐥🐥' },
  { id: 'n3', char: '3', type: TRACE_CATEGORIES.NUMBER, color: '#2ED573', word: '셋 ⭐⭐⭐' },
  { id: 'n4', char: '4', type: TRACE_CATEGORIES.NUMBER, color: '#1E90FF', word: '넷 🎈🎈🎈🎈' },
  { id: 'n5', char: '5', type: TRACE_CATEGORIES.NUMBER, color: '#9B59B6', word: '다섯 🖐️' },
  { id: 'n6', char: '6', type: TRACE_CATEGORIES.NUMBER, color: '#3742FA', word: '여섯 🚗🚗🚗' },
  { id: 'n7', char: '7', type: TRACE_CATEGORIES.NUMBER, color: '#FF6B81', word: '일곱 🌈' },
  { id: 'n8', char: '8', type: TRACE_CATEGORIES.NUMBER, color: '#20BF6B', word: '여덟 🍓🍓' },
  { id: 'n9', char: '9', type: TRACE_CATEGORIES.NUMBER, color: '#F7B731', word: '아홉 🍪🍪' },
  { id: 'n10', char: '10', type: TRACE_CATEGORIES.NUMBER, color: '#EB3B5A', word: '열 👑👑' }
];