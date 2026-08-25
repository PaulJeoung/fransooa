# 🎪 프랑수아의 신나는 놀이터
---
> **3~4세 유아를 위한 반응형 오감 자극 인터랙티브 웹 놀이터**

[![Playground Live Demo](https://img.shields.io/badge/Play_Game-프랑수아의_놀이터_바로가기-ff4757?style=for-the-badge&logo=googlechrome&logoColor=white)](https://fransooa.onrender.com/)



## 📖 프로젝트 소개
---
**fransooa`s playground**는 3~4세 유아의 소근육 발달과 인지 특성에 맞춘 반응형 웹 게임 플랫폼입니다.
아이들이 화면을 직관적으로 누르고 탐색하며 성취감을 느낄 수 있도록 설계되었습니다.

* **멀티 플랫폼 완벽 지원**: 모바일/태블릿 터치(`pointerdown`) 및 PC 마우스 클릭 모두 대응
* **청각 & 시각 피드백**: Web Audio API를 활용한 효과음 및 별가루/컨페티 파티클 시스템
* **친화적 UI/UX**: 비디오 로딩 인트로, 배경음악(BGM) 제어, 좌측 하단 플로팅 네비게이션(SNB)


## 🎮 포함된 놀이 목록
---
1. **✏️ 한글·숫자 그리기 (`TraceDrawing.vue`)**
   * 자음, 모음, 숫자(1~10) 3D 도안 채우기
   * 삐져나가지 않는 마법 브러시 & 60~65% 영역 달성 시 자동 완성 축하
2. **🎨 매직 손가락 컬러링 (`MagicDrawing.vue`)**
   * 12가지 귀여운 벡터 SVG 동물 및 캐릭터 도안 스크래치 놀이
   * 화면을 문지르면 서서히 드러나는 컬러링 효과
3. **🎈 이모티콘 팡팡 (`EmojiPop.vue`)**
   * 화면 곳곳에 나타나는 귀여운 동물/사물 이모티콘 터치 팝 게임


## 🛠️ 기술 스택
---
Frontend: Vue 3 (Composition API, <script setup>)

Build Tool: Vite

Graphic/Sound Engine: HTML5 Canvas, Web Audio API, Inline SVG

## 🚀 시작하기
---
1. 패키지 설치
   - npm install
2. 로컬 개발 서버 실행
   - npm run dev
3. 프로덕션 빌드
   - npm run build

## 📬 개발자 문의 (Contact)
---
놀이터 이용 중 불편한 점이나 새로운 기능 제안은 언제든 편하게 보내주세요!

Email: kuni05@naver.com

Playground: https://fransooa.onrender.com/

## 📁 프로젝트 파일 구조
---

```
kids-playground/
├── public/                          # 정적 미디어 리소스
│   ├── assets/
│   │   └── sounds/
│   │       └── rhythm_loop.mp3      # 메인 배경 음악 (BGM)
│   ├── loading_video.mp4            # 인트로 원형 비디오 영상
│   └── main.jpg                     # 메인 홈 배경 이미지
├── src/
│   ├── assets/                      # 게임 데이터 및 공통 스타일
│   │   ├── artworks.js              # 컬러링용 12종 SVG 도안 데이터
│   │   ├── traceData.js             # 한글/숫자 그리기 데이터 세트
│   │   └── main.css                 # 전역 기본 스타일 및 리셋
│   ├── components/                  # Vue UI 컴포넌트
│   │   ├── LoadingScreen.vue        # 인트로 비디오 & 타이핑 인디케이터
│   │   ├── MainHome.vue             # 캐릭터 카드 인터랙션 & BGM 토글 홈
│   │   ├── FloatingSnb.vue          # 좌측 하단 고정 플로팅 사이드 메뉴
│   │   └── games/                   # 개별 게임 컴포넌트
│   │       ├── TraceDrawing.vue     # 한글·숫자 핑거 드로잉
│   │       ├── MagicDrawing.vue     # 매직 손가락 컬러링
│   │       └── EmojiPop.vue         # 이모티콘 팡팡
│   ├── App.vue                      # 화면 라우팅 및 상태 관리 루트
│   └── main.js                      # Vue 애플리케이션 진입점
├── index.html                       # HTML 템플릿 & 파비콘(👶) 설정
├── package.json                     # 프로젝트 의존성 설정
└── vite.config.js                   # Vite 번들러 설정
