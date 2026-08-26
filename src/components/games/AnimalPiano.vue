<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 8개 음계 및 동물 캐릭터 데이터
const PIANO_KEYS = [
  { id: 'c4', note: '도', name: '핑크퐁', pitch: 261.63, color: '#FF7675', activeColor: '#FF5252', icon: '🦊', image: '/images/piano/01_pinkfong.png', soundLabel: '퐁!' },
  { id: 'd4', note: '레', name: '아기상어', pitch: 293.66, color: '#FFA502', activeColor: '#FF9100', icon: '🦈', image: '/images/piano/02_baby_shark.png', soundLabel: '뚜루!' },
  { id: 'e4', note: '미', name: '엄마상어', pitch: 329.63, color: '#FDCB6E', activeColor: '#FFC048', icon: '💖', image: '/images/piano/03_mom_shark.png', soundLabel: '샤크!' },
  { id: 'f4', note: '파', name: '하마', pitch: 349.23, color: '#2ED573', activeColor: '#10AC84', icon: '🦛', image: '/images/piano/04_hippo.png', soundLabel: '하품~' },
  { id: 'g4', note: '솔', name: '악어', pitch: 392.00, color: '#00CEC9', activeColor: '#01A3A4', icon: '🐊', image: '/images/piano/05_alligator.png', soundLabel: '크왕!' },
  { id: 'a4', note: '라', name: '사자', pitch: 440.00, color: '#0984E3', activeColor: '#2F3542', icon: '🦁', image: '/images/piano/06_lion.png', soundLabel: '어흥!' },
  { id: 'b4', note: '시', name: '원숭이', pitch: 493.88, color: '#6C5CE7', activeColor: '#575FCF', icon: '🐵', image: '/images/piano/07_monkey.png', soundLabel: '우끼!' },
  { id: 'c5', note: '높은 도', name: '고양이', pitch: 523.25, color: '#FD79A8', activeColor: '#E84393', icon: '🐱', image: '/images/piano/08_cat.png', soundLabel: '야옹!' }
];

const activeKeyId = ref(null);
const bubbles = ref([]);
const sparkles = ref([]);
const soundLabels = ref([]);

let audioCtx = null;
let animationFrameId = null;
let bubbleSpawnTimer = null;

// 1. Web Audio API (피아노/실로폰 사운드)
function playTone(freq) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.4);
  } catch (e) {}
}

// 2. 비누방울 뿅! 효과음
function playPopSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// 3. 비누방울 생성 (크기를 74px~92px로 키움)
function spawnBubble() {
  const randomChar = PIANO_KEYS[Math.floor(Math.random() * PIANO_KEYS.length)];
  const bubble = {
    id: Date.now() + Math.random(),
    char: randomChar,
    x: Math.random() * 74 + 13,
    y: -14,
    speed: Math.random() * 0.14 + 0.12,
    wobbleSpeed: Math.random() * 0.03 + 0.02,
    wobbleOffset: Math.random() * Math.PI * 2,
    size: Math.floor(Math.random() * 18) + 74,
    isPopping: false
  };
  bubbles.value.push(bubble);
}

// 4. 비누방울 낙하 루프
function updateBubbles() {
  const keyboardLimitY = 66;

  for (let i = bubbles.value.length - 1; i >= 0; i--) {
    const b = bubbles.value[i];
    if (!b.isPopping) {
      b.y += b.speed;
      b.wobbleOffset += b.wobbleSpeed;

      if (b.y >= keyboardLimitY) {
        bubbles.value.splice(i, 1);
      }
    }
  }
  animationFrameId = requestAnimationFrame(updateBubbles);
}

// 5. 비누방울 터뜨리기
function popBubble(bubble, customX = null, customY = null) {
  if (!bubble || bubble.isPopping) return;
  bubble.isPopping = true;
  playPopSound();

  const px = customX ?? (window.innerWidth * (bubble.x / 100));
  const py = customY ?? (window.innerHeight * (bubble.y / 100));

  const icons = ['✨', '⭐', '🫧', '💖', '🎵'];
  const newSparkles = Array.from({ length: 6 }).map(() => ({
    id: Math.random(),
    icon: icons[Math.floor(Math.random() * icons.length)],
    x: px,
    y: py,
    tx: `${(Math.random() - 0.5) * 120}px`,
    ty: `${(Math.random() - 0.5) * 120}px`
  }));
  sparkles.value.push(...newSparkles);

  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 500);

  setTimeout(() => {
    bubbles.value = bubbles.value.filter(b => b.id !== bubble.id);
  }, 180);
}

// 6. 건반 터치
function handleKeyPress(key, event) {
  playTone(key.pitch);
  activeKeyId.value = key.id;

  const oldestBubble = bubbles.value.find(b => !b.isPopping);
  if (oldestBubble) {
    popBubble(oldestBubble);
  }

  let x = window.innerWidth / 2;
  let y = window.innerHeight * 0.7;
  if (event) {
    x = event.clientX || (event.touches && event.touches[0]?.clientX) || x;
    y = event.clientY || (event.touches && event.touches[0]?.clientY) || y;
  }

  const labelId = Math.random();
  soundLabels.value.push({
    id: labelId,
    text: key.soundLabel,
    color: key.color,
    x,
    y: y - 40
  });

  setTimeout(() => {
    soundLabels.value = soundLabels.value.filter(l => l.id !== labelId);
  }, 650);

  setTimeout(() => {
    activeKeyId.value = null;
  }, 220);
}

// 7. 직접 비누방울 터치
function handleBubbleClick(bubble, event) {
  event.stopPropagation();
  popBubble(bubble, event.clientX, event.clientY);
}

function onImageError(e) {
  e.target.style.display = 'none';
  if (e.target.nextElementSibling) {
    e.target.nextElementSibling.style.display = 'flex';
  }
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(updateBubbles);
  spawnBubble();
  bubbleSpawnTimer = setInterval(spawnBubble, 1100);
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (bubbleSpawnTimer) clearInterval(bubbleSpawnTimer);
});
</script>

<template>
  <div class="piano-game-view">
    <!-- 배경 구름 & 별 장식 -->
    <div class="bg-stars">
      <span class="star-deco s1">⭐</span>
      <span class="star-deco s2">✨</span>
      <span class="star-deco s3">🌟</span>
      <span class="star-deco s4">☁️</span>
    </div>

    <!-- 상단 헤더 영역 -->
    <header class="piano-header">
      <div class="title-pill">
        <span class="rainbow-icon">🌈</span>
        <h1 class="header-text">동물 친구들의 퐁퐁 피아노</h1>
        <span class="music-icon">🎶</span>
      </div>
      <p class="guide-text">건반을 누르면 비누방울이 퐁퐁 터져요</p>
    </header>

    <!-- 떨어지는 비누방울 레이어 -->
    <div class="bubble-fall-zone">
      <div
        v-for="b in bubbles"
        :key="b.id"
        class="falling-bubble"
        :class="{ pop: b.isPopping }"
        :style="{
          left: `calc(${b.x}% + ${Math.sin(b.wobbleOffset) * 16}px)`,
          top: b.y + '%',
          width: b.size + 'px',
          height: b.size + 'px'
        }"
        @pointerdown="handleBubbleClick(b, $event)"
      >
        <!-- 비누방울 내부 원형 캐릭터 컨테이너 (네모 모서리 완전 차단) -->
        <div class="bubble-circle-core">
          <img
            :src="b.char.image"
            :alt="b.char.name"
            class="bubble-char-img"
            draggable="false"
            @error="onImageError"
          />
          <span class="bubble-emoji" style="display: none;">{{ b.char.icon }}</span>
        </div>

        <!-- 비누방울 투명 광택 및 하이라이트 -->
        <div class="bubble-gloss-ring"></div>
        <div class="bubble-highlight"></div>
      </div>
    </div>

    <!-- 하단 피아노 건반 영역 (전 기기 반응형) -->
    <main class="piano-stage">
      <div class="keyboard-container">
        <div
          v-for="key in PIANO_KEYS"
          :key="key.id"
          class="piano-key-wrapper"
          :class="{ 'key-active': activeKeyId === key.id }"
          :style="{ '--key-color': key.color, '--key-active-color': key.activeColor }"
          @pointerdown="handleKeyPress(key, $event)"
        >
          <!-- 건반 위 캐릭터 아바타 (동그란 원형 마운트) -->
          <div class="animal-avatar-box">
            <div class="animal-avatar">
              <img
                :src="key.image"
                :alt="key.name"
                class="animal-img"
                draggable="false"
                @error="onImageError"
              />
              <span class="fallback-emoji" style="display: none;">{{ key.icon }}</span>
            </div>
            <span class="char-name-tag">{{ key.name }}</span>
          </div>

          <!-- 무지개 건반 버튼 -->
          <button class="key-board" :aria-label="key.note + ' 건반'">
            <div class="key-inner">
              <span class="note-name">{{ key.note }}</span>
            </div>
          </button>
        </div>
      </div>
    </main>

    <!-- 동물 소리 말풍선 팝업 -->
    <div
      v-for="label in soundLabels"
      :key="label.id"
      class="sound-popup"
      :style="{ left: label.x + 'px', top: label.y + 'px', color: label.color }"
    >
      {{ label.text }}
    </div>

    <!-- 터질 때 튀어나오는 별가루 & 방울 파티클 -->
    <div
      v-for="p in sparkles"
      :key="p.id"
      class="sparkle-particle"
      :style="{
        left: p.x + 'px',
        top: p.y + 'px',
        '--tx': p.tx,
        '--ty': p.ty
      }"
    >
      {{ p.icon }}
    </div>
  </div>
</template>

<style scoped>
/* 전역 배경 레이아웃 */
.piano-game-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #cbebfd 0%, #a6defd 45%, #ffd3b6 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  padding: 10px 8px 18px 8px;
  box-sizing: border-box;
}

/* 배경 장식 */
.bg-stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.star-deco {
  position: absolute;
  font-size: 24px;
  opacity: 0.55;
  animation: floatStar 3.5s ease-in-out infinite alternate;
}
.s1 { top: 8%; left: 6%; animation-delay: 0s; }
.s2 { top: 12%; right: 8%; animation-delay: 0.8s; font-size: 28px; }
.s3 { top: 22%; left: 12%; animation-delay: 1.5s; font-size: 20px; }
.s4 { top: 20%; right: 14%; animation-delay: 0.4s; font-size: 36px; opacity: 0.4; }

@keyframes floatStar {
  0% { transform: translateY(0) scale(0.95); }
  100% { transform: translateY(-8px) scale(1.1); }
}

/* 상단 헤더 */
.piano-header {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4px;
  text-align: center;
  pointer-events: none;
}

.title-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.94);
  border: 4px solid #ffffff;
  padding: 6px 20px;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.header-text {
  font-size: clamp(17px, 3.8vw, 26px);
  font-weight: 900;
  color: #ff4757;
  margin: 0;
  letter-spacing: -0.5px;
}

.rainbow-icon, .music-icon { font-size: 20px; }

.guide-text {
  font-size: clamp(12px, 2.3vw, 15px);
  font-weight: 800;
  color: #2f3542;
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

/* 비누방울 낙하 영역 */
.bubble-fall-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

/* 🫧 리뉴얼된 원형 비누방울 외형 */
.falling-bubble {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8px 20px rgba(70, 160, 240, 0.3);
  transition: transform 0.15s ease-out, opacity 0.15s ease-out;
}

/* 1. 내부 원형 이미지 코어 (네모난 배경을 완벽하게 동그랗게 마스킹) */
.bubble-circle-core {
  width: 86%;
  height: 86%;
  border-radius: 50%;
  overflow: hidden;
  background-color: #ffffff;
  border: 3px solid rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.08);
}

.bubble-char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.bubble-emoji {
  font-size: 38px;
  pointer-events: none;
}

/* 2. 바깥쪽 투명 비누방울 유리 링 효과 */
.bubble-gloss-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(186, 235, 255, 0.25) 50%, rgba(142, 213, 255, 0.4) 100%);
  pointer-events: none;
}

/* 3. 상단 반사광 하이라이트 */
.bubble-highlight {
  position: absolute;
  top: 10%;
  left: 18%;
  width: 24%;
  height: 24%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  filter: blur(1.5px);
  pointer-events: none;
}

/* 팡! 터지는 효과 */
.falling-bubble.pop {
  transform: translate(-50%, -50%) scale(1.4) !important;
  opacity: 0;
}

/* 하단 피아노 스테이지 */
.piano-stage {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 960px;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}

.keyboard-container {
  width: 100%;
  height: min(65vh, 440px);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  padding: 10px 8px 12px 8px;
  border-radius: 32px;
  border: 4px solid #ffffff;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: min(8px, 1vw);
  box-sizing: border-box;
}

.piano-key-wrapper {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 동물 아바타 */
.animal-avatar-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 6px;
  pointer-events: none;
}

.animal-avatar {
  width: min(65px, 100%);
  aspect-ratio: 1 / 1;
  background: #ffffff;
  border: 3.5px solid var(--key-color);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition: transform 0.18s cubic-bezier(0.175, 0.955, 0.32, 1.4);
}

.animal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.fallback-emoji {
  font-size: min(28px, 5.5vw);
}

.char-name-tag {
  margin-top: 3px;
  font-size: clamp(9px, 1.6vw, 12px);
  font-weight: 900;
  color: #2f3542;
  background: rgba(255, 255, 255, 0.9);
  padding: 1px 5px;
  border-radius: 999px;
  white-space: nowrap;
}

/* 건반 버튼 */
.key-board {
  width: 100%;
  height: 60%;
  background: var(--key-color);
  border: 3px solid #ffffff;
  border-radius: 18px;
  box-shadow: 0 7px 0 var(--key-active-color), 0 10px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 10px;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-sizing: border-box;
}

.key-inner {
  background: rgba(255, 255, 255, 0.92);
  width: min(40px, 80%);
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.note-name {
  font-size: clamp(12px, 2.2vw, 18px);
  font-weight: 900;
  color: #2f3542;
}

/* 터치 모션 */
.piano-key-wrapper:active .animal-avatar,
.piano-key-wrapper.key-active .animal-avatar {
  transform: translateY(-20px) scale(1.2) rotate(-5deg);
}

.piano-key-wrapper:active .key-board,
.piano-key-wrapper.key-active .key-board {
  transform: translateY(5px);
  box-shadow: 0 2px 0 var(--key-active-color), 0 3px 6px rgba(0, 0, 0, 0.1);
}

/* 말풍선 팝업 */
.sound-popup {
  position: fixed;
  font-size: 24px;
  font-weight: 900;
  text-shadow: 2px 2px 0 #ffffff, -2px -2px 0 #ffffff;
  pointer-events: none;
  z-index: 9999;
  animation: floatSound 0.65s ease-out forwards;
}

@keyframes floatSound {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -20px) scale(1.3); opacity: 1; }
  100% { transform: translate(-50%, -50px) scale(1); opacity: 0; }
}

/* 별가루 파티클 */
.sparkle-particle {
  position: fixed;
  font-size: 24px;
  pointer-events: none;
  z-index: 9999;
  animation: burstParticle 0.5s ease-out forwards;
}

@keyframes burstParticle {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3); opacity: 0; }
}

/* 모바일 세로모드 최적화 */
@media (max-width: 480px) {
  .keyboard-container {
    height: min(68vh, 420px);
    padding: 6px 3px 8px 3px;
    gap: 2px;
    border-radius: 20px;
  }
  .animal-avatar { border-width: 2px; }
  .key-board { border-radius: 12px; padding-bottom: 6px; box-shadow: 0 4px 0 var(--key-active-color); }
}
</style>