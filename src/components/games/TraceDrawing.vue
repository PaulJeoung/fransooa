<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { TRACE_ITEMS, TRACE_CATEGORIES } from '../../assets/traceData.js';

const canvasRef = ref(null);
const currentItem = ref(TRACE_ITEMS[0]);
const selectedCategory = ref(TRACE_CATEGORIES.ALL);
const progressPercent = ref(0);
const isCelebrated = ref(false);
const sparkles = ref([]);
const confettiList = ref([]);

// 3,4세 유아 맞춤 파스텔 & 비비드 크레용 팔레트
const PALETTE = ['#FF4757', '#FF7F50', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6', '#FF69B4'];
const currentColor = ref(PALETTE[0]);

let ctx = null;
let isDrawing = false;
let audioCtx = null;
let lastSoundTime = 0;

// 좌/우 분할 마스크 데이터
let letterMaskData = {
  leftTotal: 0,
  rightTotal: 0,
  total: 0
};

// Web Audio API 사운드
function initAudioContext() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {}
}

function playPopTone() {
  const now = Date.now();
  if (now - lastSoundTime < 65) return;
  lastSoundTime = now;

  try {
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 1046.50];
    const note = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

function playSuccessFanfare() {
  try {
    initAudioContext();
    const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }, idx * 75);
    });
  } catch (e) {}
}

// 캔버스 초기화 및 단일 화이트 베이스 렌더링 (겹침 버그 제거)
function renderLetterBase() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const char = currentItem.value.char;
  // 글자 수에 따른 폰트 크기 동적 스케일링
  const isMultiChar = char.length > 1;
  const fontSize = Math.min(canvas.width, canvas.height) * (isMultiChar ? 0.52 : 0.68);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + fontSize * 0.34;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${fontSize}px "NanumSquareRound", "Apple SD Gothic Neo", "Comic Sans MS", sans-serif`;

  // 1. 부드러운 입체 바닥 그림자 (일체형)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(char, cx + 4, cy + 6);

  // 2. 메인 글자 바탕 (완전한 화이트로 칠하여 획 겹침 선 제거)
  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, cx, cy);

  // 3. 은은하고 둥근 외곽 경계선 (동일 계열 색상)
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(char, cx, cy);

  // 좌/우 분할 목표 픽셀 카운트 등록
  const midX = canvas.width / 2;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let leftCount = 0;
  let rightCount = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = imgData[idx + 3];

      if (alpha > 40) {
        if (x < midX) leftCount++;
        else rightCount++;
      }
    }
  }

  letterMaskData = {
    leftTotal: Math.max(leftCount, 1),
    rightTotal: Math.max(rightCount, 1),
    total: Math.max(leftCount + rightCount, 1)
  };

  progressPercent.value = 0;
  isCelebrated.value = false;
}

// 칠하기 진행도 검증 (유아 보정 및 좌우 밸런스 검사)
function evaluateProgress() {
  if (!ctx || !canvasRef.value || letterMaskData.total === 0) return;
  const canvas = canvasRef.value;
  const midX = canvas.width / 2;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let leftPainted = 0;
  let rightPainted = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const idx = (y * canvas.width + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a > 40) {
        const isGrayscale = Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
        const isWhiteOrBase = isGrayscale && r > 210;

        if (!isWhiteOrBase) {
          if (x < midX) leftPainted++;
          else rightPainted++;
        }
      }
    }
  }

  const leftRatio = leftPainted / letterMaskData.leftTotal;
  const rightRatio = rightPainted / letterMaskData.rightTotal;
  const totalRatio = (leftPainted + rightPainted) / letterMaskData.total;

  // 1. 프로그레스 바 게이지 환산 (90%를 칠했을 때 100% 도달)
  const adjustedProgress = Math.min(100, Math.round((totalRatio / 0.9) * 100)); // 👈 0.6에서 0.9로 변경
  progressPercent.value = adjustedProgress;

  // 2. 판정 기준 조건
  // - 좌/우 균형: 한쪽에만 쏠리지 않도록 양쪽 모두 최소 60~70% 이상 채워졌는지 검증
  // - 전체 일치율: 전체 면적의 90%(0.90) 이상 채워졌을 때 통과
  const isBalanced = leftRatio >= 0.65 && rightRatio >= 0.65; // 👈 0.38에서 0.65로 상향
  const isComplete = totalRatio >= 0.90;                     // 👈 0.58에서 0.90으로 상향

  if (isComplete && isBalanced && !isCelebrated.value) {
    progressPercent.value = 100;
    triggerCelebration();
  }
}

// 드로잉 인터랙션 (손가락 두께 반영 브러시)
function draw(clientX, clientY) {
  if (!ctx || !canvasRef.value || isCelebrated.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = currentColor.value;
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  playPopTone();
  spawnSparkle(clientX, clientY);
}

function spawnSparkle(x, y) {
  const id = Math.random();
  const icons = ['✨', '⭐', '💖', '🍭', '🌸'];
  sparkles.value.push({
    id,
    icon: icons[Math.floor(Math.random() * icons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 80}px`,
    ty: `${(Math.random() - 0.5) * 80}px`
  });
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => s.id !== id);
  }, 450);
}

function triggerCelebration() {
  isCelebrated.value = true;
  playSuccessFanfare();

  const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#e84393', '#feca57', '#9b59b6'];
  confettiList.value = Array.from({ length: 35 }).map(() => ({
    id: Math.random(),
    color: colors[Math.floor(Math.random() * colors.length)],
    x: Math.random() * window.innerWidth,
    y: Math.random() * (window.innerHeight * 0.4),
    size: Math.random() * 12 + 8
  }));

  setTimeout(() => {
    confettiList.value = [];
    nextItem();
  }, 2200);
}

function nextItem() {
  let pool = TRACE_ITEMS;
  if (selectedCategory.value !== TRACE_CATEGORIES.ALL) {
    pool = TRACE_ITEMS.filter(item => item.type === selectedCategory.value);
  }
  const filtered = pool.filter(item => item.id !== currentItem.value.id);
  const nextTarget = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];

  currentItem.value = nextTarget;
  currentColor.value = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  renderLetterBase();
}

function selectCategory(cat) {
  selectedCategory.value = cat;
  nextItem();
}

function handlePointerDown(e) {
  isDrawing = true;
  draw(e.clientX, e.clientY);
}
function handlePointerMove(e) {
  if (!isDrawing) return;
  draw(e.clientX, e.clientY);
}
function handlePointerUp() {
  if (isDrawing) {
    isDrawing = false;
    evaluateProgress();
  }
}

onMounted(async () => {
  await nextTick();
  renderLetterBase();
  window.addEventListener('resize', renderLetterBase);
  window.addEventListener('pointerup', handlePointerUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', renderLetterBase);
  window.removeEventListener('pointerup', handlePointerUp);
});
</script>

<template>
  <div class="trace-game-view">
    <!-- 상단 탭 및 게이지 헤더 -->
    <header class="game-header">
      <div class="category-tabs">
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.ALL }"
          @click="selectCategory(TRACE_CATEGORIES.ALL)"
        >🎲 섞어서</button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.CONSONANT }"
          @click="selectCategory(TRACE_CATEGORIES.CONSONANT)"
        >ㄱ 자음</button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.VOWEL }"
          @click="selectCategory(TRACE_CATEGORIES.VOWEL)"
        >ㅏ 모음</button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.NUMBER }"
          @click="selectCategory(TRACE_CATEGORIES.NUMBER)"
        >123 숫자</button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.ALPHABET }"
          @click="selectCategory(TRACE_CATEGORIES.ALPHABET)"
        >ABC 영어</button>
      </div>

      <div class="status-bar">
        <div class="progress-bar-bg">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <button class="skip-btn" @click="nextItem">다음 ➡️</button>
      </div>
    </header>

    <!-- [상단 1/3] 대형 연상 단어 및 일러스트 카드 -->
    <section class="word-showcase-section">
      <div class="big-word-card" :style="{ '--theme-color': currentItem.color }">
        <!-- 🖼️ 기존 {{ currentItem.emoji }} 대신 이미지 태그 적용 -->
        <div class="image-box">
          <img
            :src="currentItem.image"
            :alt="currentItem.word"
            class="word-illustration-img"
            draggable="false"
          />
        </div>

        <div class="info-box">
          <h2 class="main-word">{{ currentItem.word }}</h2>
          <p class="word-tip">{{ currentItem.tip }}</p>
        </div>
      </div>
    </section>

    <!-- [하단 2/3] 대형 트레이싱 캔버스 영역 -->
    <main class="canvas-section">
      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="trace-canvas"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
        ></canvas>

        <!-- 완성 축하 팝업 -->
        <Transition name="bounce">
          <div v-if="isCelebrated" class="celebration-overlay">
            <div class="celebration-badge">
              <span class="big-emoji">🎉</span>
              <div class="cheer-wrap">
                <span class="cheer-text">참 잘했어요!</span>
                <span class="cheer-sub">정말 멋지게 따라 썼어요! ⭐</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <!-- 하단 크레용 팔레트 -->
    <footer class="crayon-palette">
      <button
        v-for="color in PALETTE"
        :key="color"
        class="crayon-btn"
        :class="{ selected: currentColor === color }"
        :style="{ backgroundColor: color }"
        @click="currentColor = color"
      ></button>
    </footer>

    <!-- 인터랙션 파티클 -->
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

    <!-- 완성 축하 컨페티 -->
    <div
      v-for="confetti in confettiList"
      :key="confetti.id"
      class="confetti-piece"
      :style="{
        left: confetti.x + 'px',
        top: confetti.y + 'px',
        backgroundColor: confetti.color,
        width: confetti.size + 'px',
        height: confetti.size + 'px'
      }"
    ></div>
  </div>
</template>

<style scoped>
.trace-game-view {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* 1. 상단 네비게이션 헤더 */
.game-header {
  width: 100%;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  z-index: 30;
  flex-shrink: 0;
}

.category-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cat-btn {
  background: #f1f2f6;
  border: 2px solid #dfe6e9;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
  color: #636e72;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.cat-btn.active {
  background: #ff4757;
  color: #ffffff;
  border-color: #ff4757;
  box-shadow: 0 3px 0 #c2185b;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-bg {
  width: 110px;
  height: 18px;
  background-color: #dfe6e9;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid #ffffff;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ed573, #1e90ff);
  border-radius: 999px;
  transition: width 0.2s ease-out;
}

.skip-btn {
  background: #0984e3;
  color: #fff;
  border: 2px solid #ffffff;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 3px 0 #074b83;
  cursor: pointer;
  white-space: nowrap;
}

/* 2. [상단 1/3] 대형 연상 카드 */
.word-showcase-section {
  flex: 1;
  width: 100%;
  max-width: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  max-height: 28vh;
}

.big-word-card {
  width: 100%;
  height: 90%;
  background: rgba(255, 255, 255, 0.94);
  border: 4px solid var(--theme-color);
  border-radius: 28px;
  /* box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 0 var(--theme-color); */
  display: flex;
  align-items: center;
  justify-content: center; /* 카드 정중앙 정렬 */
  padding: 10px 20px;
  gap: 18px;
}

/* 🖼️ 이미지 컨테이너 (작아지지 않게 고정/비율 크기 확보) */
.image-box {
  width: clamp(68px, 16vw, 92px);
  height: clamp(68px, 16vw, 92px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* 글자가 길어져도 이미지가 찌그러지지 않음 */
  animation: floatImage 2.2s ease-in-out infinite alternate;
}

/* 실제 이미지 스타일 */
.word-illustration-img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 비율 유지하며 꽉 채움 */
  /* filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)); */
  user-select: none;
  -webkit-user-drag: none;
}

/* 둥둥 떠다니는 애니메이션 효과 */
@keyframes floatImage {
  0% { transform: translateY(0); }
  100% { transform: translateY(-6px) scale(1.06); }
}

.info-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.main-word {
  margin: 0;
  font-size: clamp(22px, 5vw, 32px);
  font-weight: 900;
  color: var(--theme-color);
  letter-spacing: -0.5px;
}

.word-tip {
  margin: 4px 0 0 0;
  font-size: clamp(13px, 3vw, 16px);
  font-weight: 800;
  color: #636e72;
}

/* 모바일 화면 대응 */
@media (max-width: 480px) {
  .word-showcase-section { 
    max-height: 25vh; 
  }
  .big-word-card {
    padding: 8px 14px;
    gap: 12px;
  }
}

/* 3. [하단 2/3] 대형 트레이싱 캔버스 */
.canvas-section {
  flex: 2;
  width: 100%;
  max-width: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 16px 10px 16px;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.trace-canvas {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  border-radius: 32px;
  border: 6px dashed #ff9ff3;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12), inset 0 0 20px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

/* 4. 하단 크레용 바 */
.crayon-palette {
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-bottom: 6px;
  z-index: 20;
  flex-shrink: 0;
}

.crayon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.crayon-btn.selected {
  transform: translateY(-8px) scale(1.22);
  border-color: #2d3436;
}

/* 완성 축하 팝업 */
.celebration-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 40;
}

.celebration-badge {
  background: #ffffff;
  border: 5px solid #fdcb6e;
  padding: 16px 24px;
  border-radius: 36px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
}

.big-emoji {
  font-size: 40px;
}

.cheer-wrap {
  display: flex;
  flex-direction: column;
}

.cheer-text {
  font-size: 24px;
  font-weight: 900;
  color: #ff4757;
}

.cheer-sub {
  font-size: 13px;
  font-weight: 800;
  color: #2d3436;
}

/* 파티클 & 애니메이션 */
.sparkle-particle {
  position: fixed;
  font-size: 22px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.45s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3); opacity: 0; }
}

.confetti-piece {
  position: fixed;
  border-radius: 4px;
  pointer-events: none;
  z-index: 9999;
  animation: fall 1.8s ease-in-out forwards;
}

@keyframes fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(380px) rotate(720deg); opacity: 0; }
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

@media (max-width: 480px) {
  .cat-btn { padding: 4px 8px; font-size: 11px; }
  .progress-bar-bg { width: 80px; }
  .crayon-btn { width: 30px; height: 30px; }
  .word-showcase-section { max-height: 25vh; }
}
</style>