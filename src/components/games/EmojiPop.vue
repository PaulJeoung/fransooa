<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const TRACE_IDS = [
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14',
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14',
  'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20',
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25', 'a26',
  'ca1', 'ca2', 'ca3', 'ca4', 'ca5', 'ca6', 'ca7'
];

const PRAISE_LIST = [
  { text: '🎺 빵빠레!', color: '#ff3838', type: 'fanfare' },
  { text: '🎉 야호~!', color: '#2ed573', type: 'cheer' },
  { text: '⭐ 멋져!', color: '#ffa502', type: 'awesome' },
  { text: '👏 최고야!', color: '#1e90ff', type: 'great' },
  { text: '✨ 대단해!', color: '#9b59b6', type: 'super' }
];

const score = ref(0);
const isPlaying = ref(false);
const isGameOver = ref(false);
const selectedMode = ref(30); // 10 또는 30
const timeLeft = ref(30);
const isWarning = ref(false); // 5초 이하 긴급 깜박임

const targets = ref([]);
const sparkles = ref([]);
const scorePops = ref([]);
const praisePops = ref([]);
const isBursting = ref(false);

let spawnTimer = null;
let gameTimer = null;
let burstIntervalTimer = null;
let audioCtx = null;
let comboCount = 0;
let lastPopTime = 0;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 뿅뿅 팝 사운드
function playPopSound() {
  try {
    initAudio();
    const now = Date.now();
    comboCount = (now - lastPopTime < 350) ? Math.min(comboCount + 1, 6) : 0;
    lastPopTime = now;

    const baseFreq = 587.33;
    const startFreq = baseFreq * (1 + comboCount * 0.12);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

// 인게임 축하 효과음
function playPraiseSound(type) {
  try {
    initAudio();
    const notes = type === 'fanfare'
      ? [523.25, 659.25, 783.99, 1046.50]
      : [659.25, 880.00, 1174.66];

    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type === 'fanfare' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      }, idx * 75);
    });
  } catch (e) {}
}

// 종료 시 축하 팡파레 멜로디 (도-미-솔-도-솔-도)
function playGameOverFanfare() {
  try {
    initAudio();
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    const timings = [0, 120, 240, 360, 520, 680];

    fanfareNotes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }, timings[idx]);
    });
  } catch (e) {}
}

// 5초 남았을 때 째깍 경고 비프음
function playWarningTick() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

// 비누방울 스폰
function spawnTarget(isBurst = false) {
  if (!isPlaying.value || isGameOver.value) return;

  const id = Date.now() + Math.random();
  const randomId = TRACE_IDS[Math.floor(Math.random() * TRACE_IDS.length)];
  const imageSrc = `/images/trace/${randomId}.png`;

  const minX = 10, maxX = 90;
  const minY = 18, maxY = 82;
  const initX = Math.random() * (maxX - minX) + minX;
  const initY = Math.random() * (maxY - minY) + minY;

  const targetObj = {
    id,
    imageSrc,
    x: initX,
    y: initY,
    size: isBurst ? Math.floor(Math.random() * 16) + 70 : 85,
    isPopped: false,
    moveInterval: null
  };

  targetObj.moveInterval = setInterval(() => {
    if (targetObj.isPopped) {
      clearInterval(targetObj.moveInterval);
      return;
    }
    targetObj.x = Math.max(minX, Math.min(maxX, targetObj.x + (Math.random() - 0.5) * 14));
    targetObj.y = Math.max(minY, Math.min(maxY, targetObj.y + (Math.random() - 0.5) * 14));
  }, 1000);

  targets.value.push(targetObj);

  setTimeout(() => {
    const current = targets.value.find(t => t.id === id);
    if (current && !current.isPopped) {
      clearInterval(current.moveInterval);
      targets.value = targets.value.filter(t => t.id !== id);
    }
  }, 4500);
}

// 버스트 연출
function triggerBubbleBurst() {
  if (!isPlaying.value || isGameOver.value) return;
  isBursting.value = true;

  const burstCount = Math.floor(Math.random() * 4) + 6;
  for (let i = 0; i < burstCount; i++) {
    setTimeout(() => {
      spawnTarget(true);
    }, i * 110);
  }

  setTimeout(() => {
    isBursting.value = false;
  }, 2000);
}

// 파티클 & 팝업 연출
function createEffects(x, y) {
  const sparkleIcons = ['✨', '⭐', '🍉', '💖', '🎉'];
  const newSparkles = Array.from({ length: 7 }).map(() => ({
    id: Math.random(),
    icon: sparkleIcons[Math.floor(Math.random() * sparkleIcons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 140}px`,
    ty: `${(Math.random() - 0.5) * 140}px`
  }));
  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 600);

  const scorePop = { id: Math.random(), x, y: y - 25 };
  scorePops.value.push(scorePop);
  setTimeout(() => {
    scorePops.value = scorePops.value.filter(sp => sp.id !== scorePop.id);
  }, 650);

  if (Math.random() < 0.35 || score.value % 5 === 0) {
    const praise = PRAISE_LIST[Math.floor(Math.random() * PRAISE_LIST.length)];
    playPraiseSound(praise.type);

    const praiseItem = {
      id: Math.random(),
      text: praise.text,
      color: praise.color,
      x: Math.max(80, Math.min(window.innerWidth - 80, x)),
      y: y - 55
    };
    praisePops.value.push(praiseItem);
    setTimeout(() => {
      praisePops.value = praisePops.value.filter(p => p.id !== praiseItem.id);
    }, 850);
  }
}

function handlePop(target, e) {
  if (target.isPopped || isGameOver.value) return;
  target.isPopped = true;
  clearInterval(target.moveInterval);

  const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || (window.innerWidth * (target.x / 100));
  const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || (window.innerHeight * (target.y / 100));

  playPopSound();
  score.value += 1;
  createEffects(clientX, clientY);

  setTimeout(() => {
    targets.value = targets.value.filter(t => t.id !== target.id);
  }, 180);
}

function clearAllTimers() {
  if (spawnTimer) clearInterval(spawnTimer);
  if (gameTimer) clearInterval(gameTimer);
  if (burstIntervalTimer) clearInterval(burstIntervalTimer);
  targets.value.forEach(t => clearInterval(t.moveInterval));
}

function setMode(seconds) {
  selectedMode.value = seconds;
  startGame();
}

function endGame() {
  clearAllTimers();
  isPlaying.value = false;
  isGameOver.value = true;
  isWarning.value = false;
  playGameOverFanfare();
}

function startGame() {
  clearAllTimers();
  score.value = 0;
  timeLeft.value = selectedMode.value;
  isGameOver.value = false;
  isWarning.value = false;
  isPlaying.value = true;
  targets.value = [];

  spawnTarget();
  spawnTimer = setInterval(() => spawnTarget(), 900);

  if (selectedMode.value >= 30) {
    burstIntervalTimer = setInterval(triggerBubbleBurst, 12000);
  }

  // 1초 단위 타이머 카운트다운
  gameTimer = setInterval(() => {
    timeLeft.value -= 1;

    if (timeLeft.value <= 5 && timeLeft.value > 0) {
      isWarning.value = true;
      playWarningTick();
    }

    if (timeLeft.value <= 0) {
      endGame();
    }
  }, 1000);
}

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  clearAllTimers();
});
</script>

<template>
  <div class="game-view emoji-bg" :class="{ 'warning-screen': isWarning }">
    <!-- 상단 게임 상태 바 -->
    <header class="game-header">
      <!-- 좌측 점수 -->
      <div class="score-badge">
        <span class="star-icon">⭐</span>
        <span>{{ score }}</span>
      </div>

      <!-- 중앙 모드 선택 및 버스트 배지 -->
      <div class="center-controls">
        <div class="mode-tabs">
          <button
            class="mode-btn"
            :class="{ active: selectedMode === 10 }"
            @click="setMode(10)"
          >
            10초
          </button>
          <button
            class="mode-btn"
            :class="{ active: selectedMode === 30 }"
            @click="setMode(30)"
          >
            30초
          </button>
        </div>
        <div v-if="isBursting" class="burst-badge">무한 방울 발사!!</div>
      </div>

      <!-- 우측 모래시계 & 시간 배지 -->
      <div class="timer-badge" :class="{ 'timer-urgent': timeLeft <= 5 }">
        <span class="hourglass-icon">⏳</span>
        <span class="time-text">{{ timeLeft }}초</span>
      </div>
    </header>

    <!-- 배경 구름 -->
    <div class="cloud cloud-1">☁️</div>
    <div class="cloud cloud-2">☁️</div>
    <div class="cloud cloud-3">☁️</div>

    <!-- 비누방울 플레이 영역 -->
    <main class="game-area">
      <div
        v-for="target in targets"
        :key="target.id"
        class="bubble-item"
        :class="{ pop: target.isPopped }"
        :style="{
          left: target.x + '%',
          top: target.y + '%',
          width: target.size + 'px',
          height: target.size + 'px'
        }"
        @pointerdown="handlePop(target, $event)"
      >
        <div class="bubble-core">
          <img :src="target.imageSrc" class="icon-img" draggable="false" />
        </div>
        <div class="bubble-glass-rim"></div>
        <div class="bubble-highlight"></div>
      </div>
    </main>

    <!-- +1 점수 팝업 -->
    <div
      v-for="sp in scorePops"
      :key="sp.id"
      class="score-float"
      :style="{ left: sp.x + 'px', top: sp.y + 'px' }"
    >
      +1
    </div>

    <!-- 칭찬 말풍선 -->
    <div
      v-for="pr in praisePops"
      :key="pr.id"
      class="praise-float"
      :style="{ left: pr.x + 'px', top: pr.y + 'px', color: pr.color }"
    >
      {{ pr.text }}
    </div>

    <!-- 파티클 -->
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

    <!-- 5초 임박 전체화면 붉은빛 플래시 오버레이 -->
    <div v-if="isWarning" class="warning-overlay"></div>

    <!-- 게임 종료 및 최종 점수 결과 모달 -->
    <Transition name="result-pop">
      <div v-if="isGameOver" class="result-modal-backdrop">
        <div class="result-card">
          <div class="thumb-icon">👍</div>
          <h2 class="result-title">대단해요~ 엄지척! 🎉</h2>
          <div class="final-score-box">
            <span class="final-label">총 점수</span>
            <span class="final-score-num">{{ score }}점</span>
          </div>
          <p class="result-subtext">비누방울을 팡팡 정말 잘 터트렸어요!</p>
          <div class="result-actions">
            <button class="cute-btn restart-btn" @click="startGame">
              한 번 더 하기! 🚀
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.emoji-bg {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #74ebd5 0%, #acb6e5 100%);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

/* 5초 이하 화면 긴급 점멸 효과 */
.warning-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 68, 68, 0.28);
  pointer-events: none;
  z-index: 90;
  animation: flashWarning 0.5s infinite alternate ease-in-out;
}

@keyframes flashWarning {
  0% { opacity: 0.15; }
  100% { opacity: 0.85; }
}

.game-header {
  position: absolute;
  top: 16px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  z-index: 100;
  box-sizing: border-box;
}

/* 점수판 */
.score-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffeb3b;
  padding: 8px 22px;
  border-radius: 999px;
  box-shadow: 0 5px 0 #fbc02d, 0 8px 15px rgba(0, 0, 0, 0.15);
  font-size: 24px;
  font-weight: 900;
  color: #d81b60;
  border: 3px solid #ffffff;
}

/* 중앙 제어 (모드 탭 & 버스트 배지) */
.center-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.mode-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.7);
  padding: 4px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.mode-btn {
  border: none;
  background: transparent;
  color: #2f3542;
  font-size: 15px;
  font-weight: 900;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #ff4757;
  color: #ffffff;
  box-shadow: 0 3px 0 #c2185b;
}

/* 우측 상단 모래시계 타이머 */
.timer-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  padding: 8px 20px;
  border-radius: 999px;
  box-shadow: 0 5px 0 #dfe4ea, 0 8px 15px rgba(0, 0, 0, 0.12);
  border: 3px solid #ff6b81;
  color: #2f3542;
  font-size: 22px;
  font-weight: 900;
}

.timer-badge.timer-urgent {
  background-color: #ff4757;
  color: #ffffff;
  border-color: #ffffff;
  box-shadow: 0 5px 0 #c2185b;
  animation: shakeTimer 0.4s infinite ease-in-out;
}

.hourglass-icon {
  animation: flipHourglass 2s infinite ease-in-out;
  display: inline-block;
}

@keyframes flipHourglass {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}

@keyframes shakeTimer {
  0%, 100% { transform: rotate(0deg) scale(1.05); }
  25% { transform: rotate(-5deg) scale(1.1); }
  75% { transform: rotate(5deg) scale(1.1); }
}

.burst-badge {
  background: rgba(255, 255, 255, 0.95);
  border: 3px solid #ff4081;
  color: #d81b60;
  font-size: 15px;
  font-weight: 900;
  padding: 4px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(255, 64, 129, 0.25);
  animation: pulseBurst 0.6s infinite alternate;
}

@keyframes pulseBurst {
  from { transform: scale(0.95); }
  to { transform: scale(1.08); }
}

.star-icon {
  animation: spinStar 3s linear infinite;
}

@keyframes spinStar {
  0% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.15) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}

.cute-btn {
  background-color: #ff4081;
  color: white;
  border: 3px solid #ffffff;
  padding: 10px 24px;
  font-size: 20px;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 5px 0 #c2185b, 0 8px 15px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.1s;
}

.cute-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #c2185b;
}

.cloud {
  position: absolute;
  font-size: 65px;
  opacity: 0.55;
  pointer-events: none;
}

.cloud-1 { top: 12%; left: 8%; animation: floatCloud 16s infinite linear; }
.cloud-2 { top: 28%; right: 8%; animation: floatCloud 22s infinite linear reverse; }
.cloud-3 { top: 55%; left: 14%; animation: floatCloud 18s infinite linear; }

@keyframes floatCloud {
  0% { transform: translateX(-30px); }
  50% { transform: translateX(30px); }
  100% { transform: translateX(-30px); }
}

.game-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.bubble-item {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: none;
  border-radius: 50%;
  transition: left 1s ease-in-out, top 1s ease-in-out, transform 0.15s ease-out;
  animation: wobbleBubble 2s infinite ease-in-out;
}

@keyframes wobbleBubble {
  0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  50% { transform: translate(-50%, -50%) scale(1.08) rotate(3deg); }
}

.bubble-core {
  width: 84%;
  height: 84%;
  border-radius: 50%;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.08);
}

.icon-img {
  width: 90%;
  height: 90%;
  object-fit: cover;
  pointer-events: none;
}

.bubble-glass-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3.5px solid rgba(255, 255, 255, 0.85);
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(186, 235, 255, 0.25) 55%, rgba(142, 213, 255, 0.45) 100%);
  box-shadow: 0 8px 18px rgba(0, 150, 255, 0.22);
  pointer-events: none;
}

.bubble-highlight {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 24%;
  height: 24%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  filter: blur(1.5px);
  pointer-events: none;
}

.bubble-item.pop {
  transform: translate(-50%, -50%) scale(1.45) !important;
  opacity: 0;
  transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.18s ease-out;
}

.score-float {
  position: fixed;
  font-size: 24px;
  font-weight: 900;
  color: #ff3838;
  text-shadow: 2px 2px 0 #ffffff;
  pointer-events: none;
  z-index: 999;
  animation: floatUp 0.65s ease-out forwards;
}

.praise-float {
  position: fixed;
  font-size: 26px;
  font-weight: 900;
  text-shadow: 2px 2px 0 #ffffff, -2px -2px 0 #ffffff, 0 4px 10px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 1000;
  animation: floatPraise 0.85s ease-out forwards;
}

@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -15px) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -40px) scale(1); opacity: 0; }
}

@keyframes floatPraise {
  0% { transform: translate(-50%, 0) scale(0.4); opacity: 0; }
  25% { transform: translate(-50%, -20px) scale(1.25); opacity: 1; }
  80% { transform: translate(-50%, -45px) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -60px) scale(0.9); opacity: 0; }
}

.sparkle-particle {
  position: fixed;
  font-size: 24px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.6s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.4); opacity: 0; }
}

/* 게임 결과 모달 */
.result-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.result-card {
  background: #ffffff;
  border-radius: 36px;
  padding: 32px 36px;
  text-align: center;
  border: 6px solid #ffeb3b;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  max-width: 380px;
  width: 85%;
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.thumb-icon {
  font-size: 64px;
  animation: pulseThumb 0.8s infinite alternate ease-in-out;
}

@keyframes pulseThumb {
  0% { transform: scale(1) rotate(-5deg); }
  100% { transform: scale(1.2) rotate(10deg); }
}

.result-title {
  font-size: 26px;
  font-weight: 900;
  color: #ff4757;
  margin: 12px 0 16px 0;
}

.final-score-box {
  background: #fff9c4;
  border-radius: 20px;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 3px dashed #fbc02d;
  margin-bottom: 12px;
}

.final-label {
  font-size: 15px;
  font-weight: 800;
  color: #8d6e63;
}

.final-score-num {
  font-size: 42px;
  font-weight: 900;
  color: #e91e63;
}

.result-subtext {
  font-size: 15px;
  font-weight: 800;
  color: #747d8c;
  margin-bottom: 22px;
}

.restart-btn {
  width: 100%;
}

@media (max-width: 480px) {
  .game-header {
    padding: 0 12px;
  }
  .score-badge {
    padding: 6px 14px;
    font-size: 18px;
  }
  .timer-badge {
    padding: 6px 14px;
    font-size: 17px;
  }
  .mode-btn {
    font-size: 13px;
    padding: 4px 10px;
  }
  .result-card {
    padding: 24px 20px;
  }
  .result-title {
    font-size: 22px;
  }
  .final-score-num {
    font-size: 36px;
  }
}
</style>