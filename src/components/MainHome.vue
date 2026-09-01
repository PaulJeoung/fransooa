<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const characters = ref([
  { id: 'shark', name: '', icon: '🦈', bubble: '뚜루루 뚜루~ 🌊', color: '#0984e3' },
  { id: 'pororo', name: '', icon: '🐧', bubble: '노는 게 제일 좋아! ❄️', color: '#ff7675' },
  { id: 'cocomelon', name: '', icon: '🍉', bubble: '신나게 놀아요! 🎶', color: '#00b894' },
  { id: 'pinkfong', name: '', icon: '🦊', bubble: '안녕 친구들! ✨', color: '#e84393' }
]);

const activeCard = ref(null);
const sparkles = ref([]);
let audioCtx = null;

// --- 배경음악 제어 로직 ---
const bgmRef = ref(null);
const isBgmPlaying = ref(false);

function playBgm() {
  if (bgmRef.value) {
    bgmRef.value.play().then(() => {
      isBgmPlaying.value = true;
    }).catch(() => {
      // 브라우저 자동재생 정책으로 실패 시 대기
      isBgmPlaying.value = false;
    });
  }
}

function toggleBgm() {
  if (!bgmRef.value) return;
  if (isBgmPlaying.value) {
    bgmRef.value.pause();
    isBgmPlaying.value = false;
  } else {
    playBgm();
  }
}

// 화면 첫 인터랙션 시 자동재생 차단 해제
function handleFirstUserGesture() {
  if (bgmRef.value && !isBgmPlaying.value) {
    playBgm();
  }
  window.removeEventListener('pointerdown', handleFirstUserGesture);
}

onMounted(() => {
  if (bgmRef.value) {
    bgmRef.value.volume = 0.4;
    playBgm();
  }
  window.addEventListener('pointerdown', handleFirstUserGesture);
});

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleFirstUserGesture);
  if (bgmRef.value) {
    bgmRef.value.pause();
  }
});

// --- 유아 맞춤 톡톡 튀는 독립 효과음 (Web Audio API) ---
function playPopSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
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
    <!-- 배경 오버레이 -->
    <div class="bg-overlay"></div>

    <!-- 배경음악 오디오 태그 (반복 재생) -->
    <audio ref="bgmRef" src="/assets/sounds/rhythm_loop.mp3" loop preload="auto"></audio>

    <!-- FloatingSnb 위에 배치되는 BGM ON/OFF 버튼 -->
    <button
      class="bgm-toggle-btn"
      :class="{ 'bgm-off': !isBgmPlaying }"
      aria-label="배경음악 켜기/끄기"
      @click="toggleBgm"
    >
      <!-- 음악 켜짐 아이콘 -->
      <svg v-if="isBgmPlaying" class="bgm-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
      <!-- 음악 꺼짐 아이콘 -->
      <svg v-else class="bgm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" fill="currentColor" />
        <circle cx="18" cy="16" r="3" fill="currentColor" />
        <line x1="2" y1="2" x2="22" y2="22" stroke="#ff4757" stroke-width="3" />
      </svg>
    </button>

    <div class="main-content">
      <!-- 메인 타이틀 바운스 박스 -->
      <div class="title-container">
        <span class="rainbow-badge">🎪 fransooa`s playground 🎪</span>
        <h1 class="main-title">우리 같이 놀아요~</h1>
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
          <!-- <span class="card-name">{{ char.name }}</span> -->

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
.home-screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-image: url('/public/images/main.jpg');
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  touch-action: manipulation;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.15) 100%);
  pointer-events: none;
}

/* FloatingSnb(bottom: 20px, left: 20px) 바로 위에 배치되는 64px 원형 버튼 */
.bgm-toggle-btn {
  position: fixed;
  left: 20px;
  bottom: 96px; /* FloatingSnb(64px) + 여백(12px) + 기본 bottom(20px) */
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #1dd1a1;
  color: #ffffff;
  border: 4px solid #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  z-index: 500;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s;
}

.bgm-toggle-btn:active {
  transform: scale(0.92);
}

.bgm-toggle-btn.bgm-off {
  background: #8395a7;
}

.bgm-icon {
  width: 30px;
  height: 30px;
}

.main-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 90%;
  margin-bottom: 500px;
}

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
  text-align: center;
  letter-spacing: -0.5px;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 #ffeaa7;
  margin: 4px 0 8px 0;
}

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
  justify-content: center;
  text-align: center;
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

.speech-bubble {
  position: absolute;
  top: -46px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d3436;
  color: #ffffff;
  font-size: 18px;
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

.bubble-pop-enter-active,
.bubble-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.bubble-pop-enter-from,
.bubble-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px) scale(0.7);
}

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