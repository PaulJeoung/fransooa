<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ARTWORKS } from '../../assets/artworks.js';

const canvasRef = ref(null);
const currentArts = ref([]);
const isMobile = ref(false);
const progressWidth = ref(0);
const showCelebration = ref(false);
const sparkles = ref([]);

let ctx = null;
let isDrawing = false;
let audioCtx = null;
let lastSoundTime = 0;

// 화면 크기 체크 (모바일 세로/가로 판별)
function checkMobile() {
  isMobile.value = window.innerWidth <= 600;
}

// 중복 없이 랜덤 이미지 선택 (모바일: 2장, 데스크톱/태블릿: 1장)
function pickRandomArtworks() {
  const count = isMobile.value ? 2 : 1;
  const shuffled = [...ARTWORKS].sort(() => Math.random() - 0.5);
  currentArts.value = shuffled.slice(0, count);
}

// 실로폰 사운드
function playSparkleSound() {
  const now = Date.now();
  if (now - lastSoundTime < 80) return;
  lastSoundTime = now;

  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const note = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// 팡파레 사운드
function playFanfare() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }, idx * 100);
    });
  } catch (e) {}
}

// 파티클
function spawnSparkle(x, y) {
  const id = Math.random();
  const icons = ['✨', '⭐', '💖'];
  const sparkle = {
    id,
    icon: icons[Math.floor(Math.random() * icons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 90}px`,
    ty: `${(Math.random() - 0.5) * 90}px`
  };
  sparkles.value.push(sparkle);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => s.id !== id);
  }, 500);
}

// 캔버스 초기화 (회색 스크래치 덮개)
function resetCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.globalCompositeOperation = 'source-over';
  
  // 파스텔 톤 회색 덮개 레이어
  ctx.fillStyle = '#dfe6e9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 중앙 안내 문구
  const fontSize = Math.max(16, Math.min(22, Math.floor(canvas.width * 0.05)));
  ctx.fillStyle = '#636e72';
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ 손가락으로 쓱쓱 문질러봐요! ✨', canvas.width / 2, canvas.height / 2);

  progressWidth.value = 0;
  showCelebration.value = false;
}

// 영역 계산 및 통과 처리
function calculateClearedArea() {
  if (!ctx || !canvasRef.value) return;
  const canvas = canvasRef.value;
  const sampleStep = 20;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparentPixels = 0;
  let totalPixels = 0;

  for (let i = 3; i < imgData.length; i += 4 * sampleStep) {
    totalPixels++;
    if (imgData[i] < 128) {
      transparentPixels++;
    }
  }

  const ratio = transparentPixels / totalPixels;
  const percentage = Math.min(100, Math.round(ratio * 170));
  progressWidth.value = percentage;

  if (percentage >= 100 && !showCelebration.value) {
    showCelebration.value = true;
    playFanfare();
    setTimeout(() => {
      nextArt();
    }, 2200);
  }
}

// 스크래치 동작
function scratch(clientX, clientY) {
  if (!ctx || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();

  playSparkleSound();
  spawnSparkle(clientX, clientY);
}

function onPointerDown(e) {
  isDrawing = true;
  scratch(e.clientX, e.clientY);
}

function onPointerMove(e) {
  if (!isDrawing) return;
  scratch(e.clientX, e.clientY);
}

function onPointerUp() {
  if (isDrawing) {
    isDrawing = false;
    calculateClearedArea();
  }
}

// 다음 랜덤 그림
function nextArt() {
  pickRandomArtworks();
  resetCanvas();
}

function handleResize() {
  const prevMobile = isMobile.value;
  checkMobile();
  if (prevMobile !== isMobile.value) {
    pickRandomArtworks();
  }
  requestAnimationFrame(() => {
    resetCanvas();
  });
}

onMounted(async () => {
  checkMobile();
  pickRandomArtworks();
  await nextTick();
  requestAnimationFrame(() => {
    resetCanvas();
  });
  window.addEventListener('resize', handleResize);
  window.addEventListener('pointerup', onPointerUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div class="game-view drawing-bg">
    <!-- 상단 컨트롤 헤더 -->
    <header class="top-bar">
      <div class="progress-container">
        <span class="progress-label">🎨 쓱싹쓱싹</span>
        <div class="progress-bar-bg">
          <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
        </div>
      </div>
      <button class="nav-btn" @click="nextArt">랜덤 그림 🎲</button>
    </header>

    <!-- 도안 및 스크래치 영역 -->
    <main class="canvas-wrapper">
      <!-- 배경 일러스트 레이어 (모바일: 세로 2개 분할 배치) -->
      <div class="illustration-layer" :class="{ 'mobile-split': isMobile }">
        <div
          v-for="(imgSrc, idx) in currentArts"
          :key="idx"
          class="art-box"
        >
          <img
            :src="imgSrc"
            alt="도안 일러스트"
            class="artwork-img"
            draggable="false"
          />
        </div>
      </div>

      <!-- 상단 스크래치 지우개 캔버스 -->
      <canvas
        ref="canvasRef"
        class="scratch-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
      ></canvas>

      <!-- 축하 팝업 -->
      <Transition name="fade">
        <div v-if="showCelebration" class="celebration">
          <div class="celebration-text">참 잘했어요! 🎉</div>
        </div>
      </Transition>
    </main>

    <!-- 별가루 파티클 -->
    <div
      v-for="sparkle in sparkles"
      :key="sparkle.id"
      class="sparkle-pop"
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
.game-view.drawing-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  display: flex;
  flex-direction: column;
}

.top-bar {
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  flex-shrink: 0;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 18px;
  font-weight: 800;
  color: #ff6b6b;
}

.progress-bar-bg {
  width: 130px;
  height: 20px;
  background-color: #dfe6e9;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid #ff7675;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff7675, #fdcb6e);
  border-radius: 999px;
  transition: width 0.2s ease-out;
}

.nav-btn {
  background-color: #0984e3;
  color: white;
  border: 3px solid #ffffff;
  padding: 6px 14px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 3px 0 #074b83;
  cursor: pointer;
  transition: transform 0.1s;
}

.nav-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #074b83;
}

/* 캔버스 래퍼 */
.canvas-wrapper {
  position: relative;
  flex: 1;
  width: 95%;
  max-width: 680px;
  margin: 10px auto 14px auto;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.illustration-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 234, 167, 0.6) 0%, rgba(250, 177, 160, 0.6) 100%);
  padding: 10px;
  box-sizing: border-box;
}

/* 모바일 분할 레이아웃: 위/아래 2개 배치 */
.illustration-layer.mobile-split {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;                /* 👈 두 그림 사이의 실제 간격 (원하는 만큼 조절) */
  padding: 0;
}

.art-box {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.mobile-split .art-box {
  width: 100%;
  height: 45%;             /* 👈 화면 높이에 맞게 크기 확보 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.artwork-img {
  width: 95%;
  height: 95%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15));
}

.mobile-split .artwork-img {
  width: 90%;
  height: 100%;
  object-fit: contain;
}

/* 🎯 핵심: 위쪽 이미지는 아래로 밀착, 아래쪽 이미지는 위로 밀착 */
.mobile-split .art-box:first-child .artwork-img {
  object-position: bottom center; /* 👈 위 그림의 콘텐츠를 바닥(중앙 쪽)으로 붙임 */
}

.mobile-split .art-box:last-child .artwork-img {
  object-position: top center;    /* 👈 아래 그림의 콘텐츠를 천장(중앙 쪽)으로 붙임 */
}

.scratch-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: pointer;
}

/* 축하 팝업 */
.celebration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 20;
}

.celebration-text {
  font-size: clamp(24px, 6vw, 34px);
  font-weight: 900;
  color: #d63031;
  background-color: #fff;
  padding: 14px 24px;
  border-radius: 36px;
  border: 5px solid #fdcb6e;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: bouncePop 0.8s infinite alternate ease-in-out;
}

@keyframes bouncePop {
  0% { transform: scale(0.9); }
  100% { transform: scale(1.1); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sparkle-pop {
  position: fixed;
  font-size: 24px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.5s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.4); opacity: 0; }
}

@media (max-width: 480px) {
  .top-bar {
    height: 58px;
    padding: 0 12px;
  }
  .progress-label {
    font-size: 15px;
  }
  .progress-bar-bg {
    width: 105px;
    height: 18px;
  }
  .nav-btn {
    padding: 5px 12px;
    font-size: 13px;
  }
  .canvas-wrapper {
    width: 96%;
    margin: 6px auto 10px auto;
    border-radius: 20px;
  }
}
</style>