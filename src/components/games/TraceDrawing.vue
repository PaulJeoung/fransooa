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

// 크레파스 색상 팔레트
const PALETTE = ['#FF4757', '#FF7F50', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6', '#FF69B4'];
const currentColor = ref(PALETTE[0]);

let ctx = null;
let isDrawing = false;
let audioCtx = null;
let lastSoundTime = 0;

// 글자 영역 마스크 정보 (좌측/우측 분할 관리)
let letterMaskData = {
  leftTotal: 0,
  rightTotal: 0,
  total: 0
};

// 1. Web Audio API 사운드 시스템
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
  if (now - lastSoundTime < 70) return;
  lastSoundTime = now;

  try {
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const notes = [440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880];
    const note = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
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
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }, idx * 80);
    });
  } catch (e) {}
}

// 2. 캔버스 초기화 및 구역별 글자 픽셀 사전 등록
function renderLetterBase() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const char = currentItem.value.char;
  const fontSize = Math.min(canvas.width, canvas.height) * 0.62;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + fontSize * 0.33;

  ctx.textAlign = 'center';
  ctx.font = `900 ${fontSize}px "NanumSquareRound", "Comic Sans MS", "Apple SD Gothic Neo", sans-serif`;

  // 3D 입체 그림자 및 기본 틀 렌더링
  ctx.fillStyle = '#b2bec3';
  ctx.fillText(char, cx + 8, cy + 10);
  ctx.fillStyle = '#dfe6e9';
  ctx.fillText(char, cx + 4, cy + 5);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, cx, cy);

  ctx.lineWidth = 14;
  ctx.strokeStyle = '#636e72';
  ctx.strokeText(char, cx, cy);

  // 좌/우 영역별 목표 픽셀 수 카운팅
  const midX = canvas.width / 2;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let leftCount = 0;
  let rightCount = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const idx = (y * canvas.width + x) * 4;
      const a = data[idx + 3];

      // 글자 형태가 존재하는 영역 카운트
      if (a > 50) {
        if (x < midX) {
          leftCount++;
        } else {
          rightCount++;
        }
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

// 3. 균형 검증 기반 정확도 판정 함수
function evaluateProgress() {
  if (!ctx || !canvasRef.value || letterMaskData.total === 0) return;
  const canvas = canvasRef.value;
  const midX = canvas.width / 2;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let leftPainted = 0;
  let rightPainted = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // 글자 영역 내부(a > 50)이면서, 초기 흰색/회색 계열이 아닌 유색 물감인 경우
      if (a > 50) {
        const isGrayscale = Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
        const isWhiteOrGray = isGrayscale && r > 160;

        if (!isWhiteOrGray) {
          if (x < midX) {
            leftPainted++;
          } else {
            rightPainted++;
          }
        }
      }
    }
  }

  // 좌/우 영역 각각의 달성률 (0.0 ~ 1.0)
  const leftRatio = leftPainted / letterMaskData.leftTotal;
  const rightRatio = rightPainted / letterMaskData.rightTotal;
  const totalRatio = (leftPainted + rightPainted) / letterMaskData.total;

  // 전체 진행률 UI 표시 (목표치 60% 기준 환산)
  const rawProgress = Math.min(100, Math.round((totalRatio / 0.8) * 100));
  progressPercent.value = rawProgress;

  const isBalanced = leftRatio >= 0.48 && rightRatio >= 0.48;
  const isOverallComplete = totalRatio >= 0.88;

  if (isOverallComplete && isBalanced && !isCelebrated.value) {
    progressPercent.value = 100;
    triggerCelebration();
  }
}

// 4. 드로잉 및 파티클 처리
function draw(clientX, clientY) {
  if (!ctx || !canvasRef.value || isCelebrated.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // 글자 내부에서만 칠해지도록 합성
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = currentColor.value;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  playPopTone();
  spawnSparkle(clientX, clientY);
}

function spawnSparkle(x, y) {
  const id = Math.random();
  sparkles.value.push({
    id,
    icon: ['✨', '⭐', '💖', '🍭'][Math.floor(Math.random() * 4)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 70}px`,
    ty: `${(Math.random() - 0.5) * 70}px`
  });
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => s.id !== id);
  }, 450);
}

function triggerCelebration() {
  isCelebrated.value = true;
  playSuccessFanfare();

  // 색종이 폭죽 파티클
  const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#e84393', '#feca57'];
  confettiList.value = Array.from({ length: 30 }).map(() => ({
    id: Math.random(),
    color: colors[Math.floor(Math.random() * colors.length)],
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * 0.4,
    size: Math.random() * 12 + 8
  }));

  setTimeout(() => {
    confettiList.value = [];
    nextItem();
  }, 2200);
}

// 5. 다음 문제 출제 및 카테고리 전환
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

// 6. 포인터 이벤트 리스너
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
    <!-- 상단 탭 및 게이지 바 -->
    <header class="game-header">
      <div class="category-tabs">
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.ALL }"
          @click="selectCategory(TRACE_CATEGORIES.ALL)"
        >
          🎲
        </button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.CONSONANT }"
          @click="selectCategory(TRACE_CATEGORIES.CONSONANT)"
        >
          자음
        </button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.VOWEL }"
          @click="selectCategory(TRACE_CATEGORIES.VOWEL)"
        >
          모음
        </button>
        <button
          class="cat-btn"
          :class="{ active: selectedCategory === TRACE_CATEGORIES.NUMBER }"
          @click="selectCategory(TRACE_CATEGORIES.NUMBER)"
        >
          숫자
        </button>
      </div>

      <div class="status-bar">
        <div class="progress-bar-bg">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <button class="skip-btn" @click="nextItem">다음</button>
      </div>
    </header>

    <!-- 글자 안내 힌트 카드 -->
    <div class="word-card">
      <span class="word-text">{{ currentItem.word }}</span>
    </div>

    <!-- 캔버스 인터랙션 영역 -->
    <main class="canvas-box">
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
            <span class="cheer-text">참 잘했어요!</span>
          </div>
        </div>
      </Transition>
    </main>

    <!-- 크레파스 색상 선택 바 -->
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

    <!-- 별가루 파티클 -->
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

    <!-- 컨페티 폭죽 파티클 -->
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
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

/* 상단 카테고리 & 게이지 */
.game-header {
  width: 100%;
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 20;
}

.category-tabs {
  display: flex;
  gap: 6px;
}

.cat-btn {
  background: #f1f2f6;
  border: 2px solid #dfe6e9;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 800;
  color: #636e72;
  cursor: pointer;
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
  gap: 10px;
}

.progress-bar-bg {
  width: 130px;
  height: 20px;
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
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 3px 0 #074b83;
  cursor: pointer;
}

/* 글자 힌트 */
.word-card {
  margin-top: 10px;
  background: #ffffff;
  border: 3px solid #fdcb6e;
  padding: 6px 20px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.word-text {
  font-size: 20px;
  font-weight: 900;
  color: #2d3436;
}

/* 캔버스 */
.canvas-box {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 480px;
  margin: 10px auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.trace-canvas {
  width: 90%;
  height: 90%;
  background: #ffffff;
  border-radius: 36px;
  border: 6px dashed #ff9ff3;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), inset 0 0 15px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

/* 크레파스 바 */
.crayon-palette {
  height: 65px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  z-index: 20;
}

.crayon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.crayon-btn.selected {
  transform: translateY(-8px) scale(1.2);
  border-color: #2d3436;
}

/* 완성 축하 */
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
}

.celebration-badge {
  background: #ffffff;
  border: 6px solid #fdcb6e;
  padding: 18px 30px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.big-emoji {
  font-size: 38px;
}

.cheer-text {
  font-size: 28px;
  font-weight: 900;
  color: #ff4757;
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
  100% { transform: translateY(350px) rotate(720deg); opacity: 0; }
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
  .cat-btn { padding: 4px 8px; font-size: 12px; }
  .progress-bar-bg { width: 90px; }
  .crayon-btn { width: 32px; height: 32px; }
}
</style>