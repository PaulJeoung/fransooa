<script setup>
import { ref } from 'vue';

// 3~4세 아이들이 직관적으로 누르고 반응을 즐길 수 있는 캐릭터 데이터
const characters = ref([
  { id: 'shark', name: '', icon: '🦈', bubble: '뚜루루 뚜루~ 🌊', color: '#0984e3' },
  { id: 'pororo', name: '', icon: '🐧', bubble: '노는 게 제일 좋아! ❄️', color: '#ff7675' },
  { id: 'cocomelon', name: '', icon: '🍉', bubble: '신나게 놀아요! 🎶', color: '#00b894' },
  { id: 'pinkfong', name: '', icon: '🦊', bubble: '안녕 친구들! ✨', color: '#e84393' }
]);

const activeCard = ref(null);
const sparkles = ref([]);
let audioCtx = null;

// 유아 맞춤 톡톡 튀는 효과음 (Web Audio API)
function playPopSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // 도, 미, 솔, 높은 도
    const note = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(note * 1.3, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    // 오디오 미지원 환경 대응
  }
}

// 터치/클릭 시 별가루 이펙트 생성
function triggerInteraction(char, event) {
  playPopSound();
  activeCard.value = char.id;

  // 클릭/터치 좌표 획득
  const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || window.innerWidth / 2;
  const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || window.innerHeight / 2;

  const icons = ['✨', '⭐', '💖', '🎈', '🎉'];
  const newSparkles = Array.from({ length: 5 }).map(() => ({
    id: Math.random(),
    icon: icons[Math.floor(Math.random() * icons.length)],
    x: clientX,
    y: clientY,
    tx: `${(Math.random() - 0.5) * 140}px`,
    ty: `${(Math.random() - 0.5) * 140}px`
  }));

  sparkles.value.push(...newSparkles);

  setTimeout(() => {
    activeCard.value = null;
  }, 1200);

  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 600);
}
</script>

<template>
  <div class="home-screen">
    <!-- 배경 오버레이 (배경 이미지의 깊이감과 가독성 유지) -->
    <div class="bg-overlay"></div>

    <div class="main-content">
      <!-- 메인 타이틀 바운스 박스 -->
      <div class="title-container">
        <span class="rainbow-badge">🎪 fransooa`s playground 🎪</span>
        <h1 class="main-title">fransooa 의 양손 놀이터</h1>
        <!-- <p class="sub-title">👇 왼쪽 아래 <b>[메뉴 버튼]</b>을 눌러 게임을 골라요!</p> -->
      </div>

      <!-- 인터랙티브 캐릭터 카드 리스트 -->
      <div class="char-showcase">
        <div
          v-for="char in characters"
          :key="char.id"
          class="char-card"
          :class="{ 'card-active': activeCard === char.id }"
          :style="{ '--theme-color': char.color }"
          @pointerdown="triggerInteraction(char, $event)"
        >
          <span class="card-icon">{{ char.icon }}</span>
          <span class="card-name">{{ char.name }}</span>

          <!-- 누르면 나타나는 말풍선 -->
          <Transition name="bubble-pop">
            <div v-if="activeCard === char.id" class="speech-bubble">
              {{ char.bubble }}
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 별가루 파티클 컨테이너 -->
    <div
      v-for="sparkle in sparkles"
      :key="sparkle.id"
      class="sparkle-particle"
      :style="{
        left: sparkle.x + 'px',
        top: sparkle.y + 'px',
        '--tx': sparkle.tx,
        '--ty': sparkle.ty
      }"
    >
      {{ sparkle.icon }}
    </div>
  </div>
</template>

<style scoped>
/* 1. 배경 화면 설정 (main.jpg 적용) */
.home-screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-image: url('/public/images/main.jpg'); /* public/main.jpg 기준 */
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  touch-action: manipulation;
}

/* 배경 위 은은한 딤 레이어 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.15) 100%);
  pointer-events: none;
}

/* 2. 중앙 컨텐츠 영역 */
.main-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 90%;
  margin-bottom: 500px;
}

/* 상단 배지 & 타이틀 */
.title-container {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  border: 4px solid #ffffff;
  padding: 16px 28px;
  border-radius: 36px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  animation: floatTitle 3s ease-in-out infinite alternate;
  margin-bottom: 24px;
}

@keyframes floatTitle {
  0% { transform: translateY(0); }
  100% { transform: translateY(-8px); }
}

.rainbow-badge {
  display: inline-block;
  background: linear-gradient(90deg, #ff7675, #fdcb6e, #55efc4, #74b9ff, #a29bfe);
  color: #2d3436;
  font-size: 14px;
  font-weight: 900;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 8px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.main-title {
  font-size: clamp(24px, 5vw, 38px);
  font-weight: 900;
  color: #17a0df;
  letter-spacing: -0.5px;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 #ffeaa7;
  margin: 4px 0 8px 0;
}

.sub-title {
  font-size: clamp(14px, 2.5vw, 17px);
  color: #2d3436;
  font-weight: 800;
}

/* 3. 유아용 인터랙티브 캐릭터 카드 리스트 */
.char-showcase {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  max-width: 600px;
}

.char-card {
  position: relative;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  padding: 10px 18px;
  border-radius: 26px;
  font-size: 16px;
  font-weight: 900;
  color: var(--theme-color);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15), 0 4px 0 var(--theme-color);
  border: 3px solid #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.char-card:hover {
  transform: translateY(-4px) scale(1.05);
}

.char-card:active,
.card-active {
  transform: scale(0.92) !important;
}

.card-icon {
  font-size: 24px;
}

/* 말풍선 팝업 */
.speech-bubble {
  position: absolute;
  top: -46px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d3436;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 16px;
  white-space: nowrap;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 20;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: #2d3436 transparent transparent;
}

/* 말풍선 애니메이션 */
.bubble-pop-enter-active,
.bubble-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.bubble-pop-enter-from,
.bubble-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px) scale(0.7);
}

/* 4. 별가루 파티클 */
.sparkle-particle {
  position: fixed;
  font-size: 22px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.6s ease-out forwards;
}

@keyframes burst {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3);
    opacity: 0;
  }
}

/* 모바일 세로 화면 대응 */
@media (max-width: 480px) {
  .title-container {
    padding: 12px 18px;
    border-radius: 28px;
  }
  .char-card {
    padding: 8px 14px;
    font-size: 14px;
  }
}
</style>