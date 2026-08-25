<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ARTWORKS } from '../../assets/artworks.js';

const canvasRef = ref(null);
const currentIdx = ref(0);
const progressWidth = ref(0);
const showCelebration = ref(false);
const sparkles = ref([]);

let ctx = null;
let isDrawing = false;
let audioCtx = null;
let lastSoundTime = 0;

// 1. 유아용 실로폰 톤 사운드
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

// 2. 축하 팡파레 사운드
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

// 3. 별가루 파티클 생성
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

// 4. 캔버스 리셋 및 덮개 그리기
function resetCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#dfe6e9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b2bec3';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('손가락으로 쓱쓱 문질러봐요! ✨', canvas.width / 2, canvas.height / 2);

  progressWidth.value = 0;
  showCelebration.value = false;
}

// 5. 칠한 영역 비율 계산 (샘플링 기반)
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
  const percentage = Math.min(100, Math.round(ratio * 130));
  progressWidth.value = percentage;

  // 75% 이상 문지르면 100% 도달 및 축하 연출
  if (percentage >= 100 && !showCelebration.value) {
    showCelebration.value = true;
    playFanfare();
    setTimeout(() => {
      nextArt();
    }, 2200);
  }
}

// 6. 스크래치 지우개 동작
function scratch(clientX, clientY) {
  if (!ctx || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
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

function nextArt() {
  currentIdx.value = (currentIdx.value + 1) % ARTWORKS.length;
  resetCanvas();
}

onMounted(async () => {
  await nextTick();
  resetCanvas();
  window.addEventListener('resize', resetCanvas);
  window.addEventListener('pointerup', onPointerUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', resetCanvas);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div class="game-view drawing-bg">
    <!-- 상단 프로그레스 바 & 이동 버튼 -->
    <header class="top-bar">
      <div class="progress-container">
        <span class="progress-label">🎨 쓱싹쓱싹:</span>
        <div class="progress-bar-bg">
          <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
        </div>
      </div>
      <button class="nav-btn" @click="nextArt">다음 그림 ➡️</button>
    </header>

    <!-- 캔버스 영역 -->
    <main class="canvas-wrapper">
      <div class="illustration-layer" v-html="ARTWORKS[currentIdx]"></div>
      <canvas
        ref="canvasRef"
        class="scratch-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
      ></canvas>

      <!-- 축하 팝업 오버레이 -->
      <Transition name="fade">
        <div v-if="showCelebration" class="celebration">
          <div class="celebration-text">참 잘했어요! 🎉</div>
        </div>
      </Transition>
    </main>

    <!-- 별가루 터치 파티클 -->
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
.drawing-bg {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  display: flex;
  flex-direction: column;
}

/* 상단 프로그레스 바 영역 */
.top-bar {
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-label {
  font-size: 20px;
  font-weight: 800;
  color: #ff6b6b;
}

.progress-bar-bg {
  width: 170px;
  height: 22px;
  background-color: #eee;
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
  padding: 8px 18px;
  font-size: 17px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 4px 0 #074b83;
  cursor: pointer;
  transition: transform 0.1s;
}

.nav-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #074b83;
}

/* 캔버스 래퍼 */
.canvas-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  overflow: hidden;
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
}

.illustration-layer :deep(svg) {
  width: 85%;
  height: 85%;
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
  font-size: 36px;
  font-weight: 900;
  color: #d63031;
  background-color: #fff;
  padding: 18px 32px;
  border-radius: 40px;
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

/* 별가루 터치 이펙트 */
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
    padding: 0 12px;
  }
  .progress-bar-bg {
    width: 110px;
  }
  .progress-label {
    font-size: 16px;
  }
  .nav-btn {
    padding: 6px 14px;
    font-size: 15px;
  }
}
</style>