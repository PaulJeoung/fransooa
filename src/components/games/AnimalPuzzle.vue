<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const TOTAL_PUZZLES = 32;
const PUZZLE_ITEMS = Array.from({ length: TOTAL_PUZZLES }, (_, i) => {
  const num = i + 1;
  return {
    id: num,
    title: `퍼즐 친구 ${num}`,
    sound: '우와! 쏙 들어갔어요! 🌟',
    image: `/images/fransooa/${num}.png`
  };
});

const currentIdx = ref(0);
const currentItem = ref(PUZZLE_ITEMS[0]);
const isMatched = ref(false);
const showCelebration = ref(false);
const sparkles = ref([]);
const soundLabels = ref([]);

// 조각과 실루엣의 동적 좌표
const piecePos = ref({ x: 100, y: 500 });
const silhouettePos = ref({ x: 200, y: 200 });

let audioCtx = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// 1. 유아용 효과음 (실로폰 & 팡파레)
function playTone(freq = 523.25) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

function playFanfare() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => playTone(freq), idx * 90);
    });
  } catch (e) {}
}

// 2. 별가루 파티클
function spawnSparkles(x, y) {
  const icons = ['✨', '⭐', '💖', '🎉', '🌟'];
  const newSparkles = Array.from({ length: 10 }).map(() => ({
    id: Math.random(),
    icon: icons[Math.floor(Math.random() * icons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 150}px`,
    ty: `${(Math.random() - 0.5) * 150}px`
  }));
  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 600);
}

// 3. 매 턴마다 정답 실루엣과 조각 위치를 무작위로 생성
function randomizePositions() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 정답 실루엣 틀: 상단 영역 (X: 25%~75%, Y: 26%~42%)
  const silMinX = width * 0.25;
  const silMaxX = width * 0.75;
  const silMinY = height * 0.26;
  const silMaxY = height * 0.42;

  silhouettePos.value = {
    x: Math.floor(Math.random() * (silMaxX - silMinX) + silMinX),
    y: Math.floor(Math.random() * (silMaxY - silMinY) + silMinY)
  };

  // 퍼즐 조각 시작 위치: 하단 영역 (X: 20%~80%, Y: 70%~82%)
  const pieceMinX = width * 0.20;
  const pieceMaxX = width * 0.80;
  const pieceMinY = height * 0.70;
  const pieceMaxY = height * 0.82;

  piecePos.value = {
    x: Math.floor(Math.random() * (pieceMaxX - pieceMinX) + pieceMinX),
    y: Math.floor(Math.random() * (pieceMaxY - pieceMinY) + pieceMinY)
  };
}

function initPuzzle() {
  isMatched.value = false;
  showCelebration.value = false;
  currentItem.value = PUZZLE_ITEMS[currentIdx.value];
  randomizePositions();
}

function prevPuzzle() {
  currentIdx.value = (currentIdx.value - 1 + TOTAL_PUZZLES) % TOTAL_PUZZLES;
  initPuzzle();
}

function nextPuzzle() {
  currentIdx.value = (currentIdx.value + 1) % TOTAL_PUZZLES;
  initPuzzle();
}

// 4. 터치 & 드래그 인터랙션
function onPointerDown(e) {
  if (isMatched.value) return;
  isDragging = true;
  
  const clientX = e.clientX || e.touches?.[0]?.clientX;
  const clientY = e.clientY || e.touches?.[0]?.clientY;
  
  dragOffset.x = clientX - piecePos.value.x;
  dragOffset.y = clientY - piecePos.value.y;
}

function onPointerMove(e) {
  if (!isDragging || isMatched.value) return;
  
  const clientX = e.clientX || e.touches?.[0]?.clientX;
  const clientY = e.clientY || e.touches?.[0]?.clientY;
  
  piecePos.value = {
    x: clientX - dragOffset.x,
    y: clientY - dragOffset.y
  };
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;

  // 거리 계산 (80px 이내면 자석처럼 정답에 스냅)
  const dx = piecePos.value.x - silhouettePos.value.x;
  const dy = piecePos.value.y - silhouettePos.value.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 80) {
    piecePos.value = { ...silhouettePos.value };
    triggerSuccess();
  }
}

// 5. 성공 연출
function triggerSuccess() {
  isMatched.value = true;
  showCelebration.value = true;
  playFanfare();
  spawnSparkles(silhouettePos.value.x, silhouettePos.value.y);

  const labelId = Math.random();
  soundLabels.value.push({
    id: labelId,
    text: currentItem.value.sound,
    x: silhouettePos.value.x,
    y: Math.max(70, silhouettePos.value.y - 80)
  });

  setTimeout(() => {
    soundLabels.value = soundLabels.value.filter(l => l.id !== labelId);
  }, 1200);

  setTimeout(() => {
    nextPuzzle();
  }, 2000);
}

onMounted(async () => {
  await nextTick();
  initPuzzle();

  window.addEventListener('resize', randomizePositions);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', randomizePositions);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div class="puzzle-view">
    <!-- 상단 헤더 & 컨트롤 -->
    <header class="puzzle-header">
      <div class="top-nav-bar">
        <button class="nav-arrow-btn" @click="prevPuzzle">◀</button>
        <div class="title-pill">
          <span class="icon">🧩</span>
          <h1>실루엣 퍼즐 ({{ currentIdx + 1 }}/{{ TOTAL_PUZZLES }})</h1>
          <span class="icon">✨</span>
        </div>
        <button class="nav-arrow-btn" @click="nextPuzzle">▶</button>
      </div>
      <p class="guide-text">동그란 그림자에 쏙 맞춰보세요!</p>
    </header>

    <!-- 게임 플레이 무대 -->
    <main class="puzzle-stage">
      <!-- 1. 정답 실루엣 틀 (동그란 원형 마스크 + 부드러운 그림자) -->
      <div
        class="silhouette-slot"
        :style="{ left: silhouettePos.x + 'px', top: silhouettePos.y + 'px' }"
      >
        <div class="slot-circle-mask">
          <img
            :src="currentItem.image"
            alt="그림자 도안"
            class="silhouette-img"
            draggable="false"
          />
        </div>
        <!-- 둥근 점선 가이드 테두리 -->
        <div class="slot-dashed-ring"></div>
      </div>

      <!-- 2. 드래그하는 동그란 캐릭터 조각 -->
      <div
        class="puzzle-piece"
        :class="{ matched: isMatched }"
        :style="{ left: piecePos.x + 'px', top: piecePos.y + 'px' }"
        @pointerdown="onPointerDown"
      >
        <div class="piece-circle-mask">
          <img
            :src="currentItem.image"
            alt="퍼즐 조각"
            class="piece-img"
            draggable="false"
          />
        </div>
      </div>
    </main>

    <!-- 참 잘했어요 팝업 -->
    <Transition name="bounce">
      <div v-if="showCelebration" class="celebration-popup">
        <div class="celebration-card">
          <span class="cheer-emoji">🎉</span>
          <span class="cheer-text">참 잘했어요!</span>
        </div>
      </div>
    </Transition>

    <!-- 사운드 말풍선 -->
    <div
      v-for="l in soundLabels"
      :key="l.id"
      class="sound-badge"
      :style="{ left: l.x + 'px', top: l.y + 'px' }"
    >
      {{ l.text }}
    </div>

    <!-- 터치 별가루 -->
    <div
      v-for="s in sparkles"
      :key="s.id"
      class="sparkle"
      :style="{ left: s.x + 'px', top: s.y + 'px', '--tx': s.tx, '--ty': s.ty }"
    >
      {{ s.icon }}
    </div>
  </div>
</template>

<style scoped>
.puzzle-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* 상단 네비게이션 헤더 */
.puzzle-header {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.top-nav-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-arrow-btn {
  background: #ffffff;
  border: 3px solid #ff7675;
  color: #ff4757;
  font-size: 16px;
  font-weight: 900;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-arrow-btn:active {
  transform: scale(0.92);
}

.title-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  padding: 6px 18px;
  border-radius: 999px;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.title-pill h1 {
  font-size: 18px;
  font-weight: 900;
  color: #ff4757;
  margin: 0;
}

.guide-text {
  font-size: 14px;
  font-weight: 800;
  color: #2f3542;
  margin-top: 6px;
}

/* 플레이 무대 */
.puzzle-stage {
  position: relative;
  flex: 1;
  width: 100%;
}

/* 1. 정답 실루엣 틀 */
.silhouette-slot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 동그란 원형 마스크로 사각 흰 배경을 완전히 동그랗게 잘라냄 */
.slot-circle-mask {
  width: 126px;
  height: 126px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: center;
  align-items: center;
}

.silhouette-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0) opacity(0.32);
  pointer-events: none;
}

/* 점선 회전 링 */
.slot-dashed-ring {
  position: absolute;
  width: 136px;
  height: 136px;
  border: 4px dashed #ff7675;
  border-radius: 50%;
  animation: rotateRing 14s linear infinite;
  opacity: 0.65;
}

@keyframes rotateRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 2. 동그란 퍼즐 조각 (하얀 배경을 둥근 원형 카드 형태로 정렬) */
.puzzle-piece {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 136px;
  height: 136px;
  background: #ffffff;
  border: 4px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  touch-action: none;
  transition: transform 0.1s ease;
}

.puzzle-piece:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.12);
}

.puzzle-piece.matched {
  animation: popSuccess 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}

@keyframes popSuccess {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.22); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

.piece-circle-mask {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.piece-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* 축하 팝업 */
.celebration-popup {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 50;
}

.celebration-card {
  background: #ffffff;
  border: 5px solid #fdcb6e;
  padding: 16px 28px;
  border-radius: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.cheer-emoji { font-size: 32px; }
.cheer-text { font-size: 26px; font-weight: 900; color: #ff4757; }

/* 말풍선 */
.sound-badge {
  position: fixed;
  transform: translate(-50%, -50%);
  background: #ffffff;
  color: #ff4757;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 19px;
  font-weight: 900;
  border: 3px solid #ff7675;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 100;
  animation: floatUp 0.85s ease-out forwards;
}

@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -20px) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -45px) scale(1); opacity: 0; }
}

/* 파티클 */
.sparkle {
  position: fixed;
  font-size: 24px;
  pointer-events: none;
  z-index: 999;
  animation: burstParticle 0.5s ease-out forwards;
}

@keyframes burstParticle {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3); opacity: 0; }
}

.bounce-enter-active {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.bounce-leave-active {
  transition: opacity 0.3s;
}
.bounce-leave-to {
  opacity: 0;
}

@keyframes popIn {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>