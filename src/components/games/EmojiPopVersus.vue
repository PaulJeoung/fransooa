<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const TRACE_IDS = [
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14',
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14',
  'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20',
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25', 'a26',
  'ca1', 'ca2', 'ca3', 'ca4', 'ca5', 'ca6', 'ca7'
];

const score1 = ref(0);
const score2 = ref(0);
const isPlaying = ref(false);
const isGameOver = ref(false);
const selectedMode = ref(30); // 10초 또는 30초
const timeLeft = ref(30);
const isBooster = ref(false); // 5초 전 부스터 모드 (3~4배 생성)
const isPortrait = ref(false); // 세로 모드 감지 방어 플래그

const targets = ref([]);
const sparkles = ref([]);
const scorePops = ref([]);

let spawnTimer = null;
let gameTimer = null;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 팝 사운드 (선수별 톤 구분: 1P 기본톤, 2P 살짝 높은 피치)
function playPopSound(player) {
  try {
    initAudio();
    const baseFreq = player === 1 ? 587.33 : 659.25;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, audioCtx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
  } catch (e) {}
}

function playWarningTick() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playGameOverFanfare() {
  try {
    initAudio();
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    const timings = [0, 110, 220, 330, 480, 640];
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

// 비누방울 스폰 (좌/우 진영 구분)
function spawnTargetForSide(playerSide) {
  if (!isPlaying.value || isGameOver.value) return;

  const id = Date.now() + Math.random();
  const randomId = TRACE_IDS[Math.floor(Math.random() * TRACE_IDS.length)];
  const imageSrc = `/images/trace/${randomId}.png`;

  // 1P: 5% ~ 45%, 2P: 55% ~ 95%
  const minX = playerSide === 1 ? 6 : 56;
  const maxX = playerSide === 1 ? 44 : 94;
  const minY = 20, maxY = 80;

  const initX = Math.random() * (maxX - minX) + minX;
  const initY = Math.random() * (maxY - minY) + minY;

  const targetObj = {
    id,
    playerSide,
    imageSrc,
    x: initX,
    y: initY,
    size: isBooster.value ? Math.floor(Math.random() * 14) + 68 : 80,
    isPopped: false,
    moveInterval: null
  };

  targetObj.moveInterval = setInterval(() => {
    if (targetObj.isPopped) {
      clearInterval(targetObj.moveInterval);
      return;
    }
    targetObj.x = Math.max(minX, Math.min(maxX, targetObj.x + (Math.random() - 0.5) * 12));
    targetObj.y = Math.max(minY, Math.min(maxY, targetObj.y + (Math.random() - 0.5) * 12));
  }, 1000);

  targets.value.push(targetObj);

  setTimeout(() => {
    const current = targets.value.find(t => t.id === id);
    if (current && !current.isPopped) {
      clearInterval(current.moveInterval);
      targets.value = targets.value.filter(t => t.id !== id);
    }
  }, 3800);
}

function spawnWave() {
  // 양측 진영에 1~2개씩 동시 생성 (기본 1.5~2배 물량)
  spawnTargetForSide(1);
  spawnTargetForSide(2);
  if (Math.random() < 0.6) spawnTargetForSide(1);
  if (Math.random() < 0.6) spawnTargetForSide(2);
}

function handlePop(target, e) {
  if (target.isPopped || isGameOver.value) return;
  target.isPopped = true;
  clearInterval(target.moveInterval);

  const isLeftTouch = (e.clientX || (e.touches && e.touches[0]?.clientX)) < (window.innerWidth / 2);
  const player = target.playerSide;

  if (player === 1) score1.value += 1;
  else score2.value += 1;

  playPopSound(player);

  const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || (window.innerWidth * (target.x / 100));
  const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || (window.innerHeight * (target.y / 100));

  // 파티클 및 스코어 이펙트
  const sparkleIcons = player === 1 ? ['🍓', '✨', '💖', '⭐'] : ['🍉', '✨', '💎', '⭐'];
  const newSparkles = Array.from({ length: 6 }).map(() => ({
    id: Math.random(),
    icon: sparkleIcons[Math.floor(Math.random() * sparkleIcons.length)],
    x: clientX,
    y: clientY,
    tx: `${(Math.random() - 0.5) * 120}px`,
    ty: `${(Math.random() - 0.5) * 120}px`
  }));
  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 550);

  const scorePop = { id: Math.random(), x: clientX, y: clientY - 24, player };
  scorePops.value.push(scorePop);
  setTimeout(() => {
    scorePops.value = scorePops.value.filter(sp => sp.id !== scorePop.id);
  }, 600);

  setTimeout(() => {
    targets.value = targets.value.filter(t => t.id !== target.id);
  }, 160);
}

function clearAllTimers() {
  if (spawnTimer) clearInterval(spawnTimer);
  if (gameTimer) clearInterval(gameTimer);
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
  isBooster.value = false;
  playGameOverFanfare();
}

function startGame() {
  clearAllTimers();
  score1.value = 0;
  score2.value = 0;
  timeLeft.value = selectedMode.value;
  isGameOver.value = false;
  isBooster.value = false;
  isPlaying.value = true;
  targets.value = [];

  // 기본 1.5~2배 빠른 생성 주기 (450ms)
  spawnWave();
  spawnTimer = setInterval(spawnWave, 450);

  gameTimer = setInterval(() => {
    timeLeft.value -= 1;

    // 5초 전 부스터 모드 (3~4배 많은 비누방울 스폰)
    if (timeLeft.value === 5) {
      isBooster.value = true;
      if (spawnTimer) clearInterval(spawnTimer);
      // 부스터 시 160ms 주기로 폭풍 스폰
      spawnTimer = setInterval(spawnWave, 160);
    }

    if (timeLeft.value <= 5 && timeLeft.value > 0) {
      playWarningTick();
    }

    if (timeLeft.value <= 0) {
      endGame();
    }
  }, 1000);
}

// 화면 방향 제어 및 강제 가로모드 방어 로직
async function lockOrientation() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) {
    // 브라우저 권한/환경 제약 시 패스
  }
}

function checkOrientation() {
  isPortrait.value = window.innerHeight > window.innerWidth;
}

onMounted(() => {
  checkOrientation();
  lockOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  startGame();
});

onUnmounted(() => {
  clearAllTimers();
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('orientationchange', checkOrientation);
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {}
});
</script>

<template>
  <div class="versus-view" :class="{ booster: isBooster }">
    <!-- 가로 모드 강제 방어 오버레이 -->
    <div v-if="isPortrait" class="rotate-lock-guard">
      <div class="rotate-card">
        <span class="rotate-icon">📱 🔄</span>
        <h2>화면을 가로로 돌려주세요!</h2>
        <p>1:1 대결 모드는 가로 화면에서만 신나게 즐길 수 있어요!</p>
      </div>
    </div>

    <!-- 중앙 분할선 & 센터 대결 엠블럼 -->
    <div class="split-divider">
      <div class="vs-badge" :class="{ 'vs-burst': isBooster }">
        {{ isBooster ? '🔥 부스터!' : 'VS' }}
      </div>
    </div>

    <!-- 1P 구역 (좌측 딸기팀: 레드 노을 하늘 + 구름) -->
    <section class="player-zone p1-zone">
      <div class="sky-decor-layer">
        <div class="sun-glow p1-glow"></div>
        <div class="floating-cloud cloud-a1">☁️</div>
        <div class="floating-cloud cloud-a2">☁️</div>
        <div class="floating-cloud cloud-a3">☁️</div>
        <div class="floating-star star-1">✨</div>
      </div>
      <div class="player-hud">
        <span class="p-tag p1-tag">🍓딸기팀🍓</span>
        <div class="score-pill p1-score">⭐ {{ score1 }}</div>
      </div>
    </section>

    <!-- 2P 구역 (우측 수박팀: 청량 블루 하늘 + 구름) -->
    <section class="player-zone p2-zone">
      <div class="sky-decor-layer">
        <div class="sun-glow p2-glow"></div>
        <div class="floating-cloud cloud-b1">☁️</div>
        <div class="floating-cloud cloud-b2">☁️</div>
        <div class="floating-cloud cloud-b3">☁️</div>
        <div class="floating-star star-2">✨</div>
      </div>
      <div class="player-hud">
        <div class="score-pill p2-score">⭐ {{ score2 }}</div>
        <span class="p-tag p2-tag">🍉수박팀🍉</span>
      </div>
    </section>

    <!-- 중앙 상단 타이머 및 모드 제어 탭 -->
    <header class="center-header">
      <div class="mode-tabs">
        <button class="mode-btn" :class="{ active: selectedMode === 10 }" @click="setMode(10)">10초</button>
        <button class="mode-btn" :class="{ active: selectedMode === 30 }" @click="setMode(30)">30초</button>
      </div>
      <div class="timer-badge" :class="{ urgent: timeLeft <= 5 }">
        <span class="hourglass">⏳</span>
        <span>{{ timeLeft }}초</span>
      </div>
    </header>

    <!-- 비누방울 타겟 레이어 -->
    <main class="bubbles-field">
      <div
        v-for="target in targets"
        :key="target.id"
        class="bubble-item"
        :class="[target.playerSide === 1 ? 'bubble-p1' : 'bubble-p2', { pop: target.isPopped }]"
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
      :class="sp.player === 1 ? 'p1-text' : 'p2-text'"
      :style="{ left: sp.x + 'px', top: sp.y + 'px' }"
    >
      +1
    </div>

    <!-- 파티클 -->
    <div
      v-for="sparkle in sparkles"
      :key="sparkle.id"
      class="sparkle-particle"
      :style="{ left: sparkle.x + 'px', top: sparkle.y + 'px', '--tx': sparkle.tx, '--ty': sparkle.ty }"
    >
      {{ sparkle.icon }}
    </div>

    <!-- 5초 부스터 불꽃 플래시 오버레이 -->
    <div v-if="isBooster" class="booster-overlay"></div>

    <!-- 종료 및 대결 승패 결과 모달 -->
    <Transition name="result-pop">
      <div v-if="isGameOver" class="result-backdrop">
        <div class="result-card">
          <div class="result-icon">
            {{ score1 === score2 ? '🤝' : (score1 > score2 ? '🍓' : '🍉') }}
          </div>
          <h2 class="result-title">
            {{ score1 === score2 ? '사이좋게 무승부!' : (score1 > score2 ? '🍓딸기팀 승리! 🎉' : '🍉수박팀 승리! 🎉') }}
          </h2>
          <div class="vs-final-board">
            <div class="final-player p1-box">
              <span class="p-name">🍓딸기팀</span>
              <span class="p-score">{{ score1 }}점</span>
            </div>
            <span class="final-vs">:</span>
            <div class="final-player p2-box">
              <span class="p-name">🍉수박팀</span>
              <span class="p-score">{{ score2 }}점</span>
            </div>
          </div>
          <p class="result-subtext">둘 다 팡팡 너무 잘 터트렸어요! 엄지척 👍</p>
          <button class="cute-btn" @click="startGame">한 번 더 대결하기! 🚀</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.versus-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  background: #f1f2f6;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

/* 화면 회전 방어 오버레이 */
.rotate-lock-guard {
  position: fixed;
  inset: 0;
  background: rgba(18, 24, 38, 0.94);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  text-align: center;
}

.rotate-card {
  background: white;
  padding: 30px 24px;
  border-radius: 28px;
  border: 4px solid #ff4757;
  max-width: 320px;
}

.rotate-icon {
  font-size: 50px;
  display: inline-block;
  animation: spinPhone 1.8s infinite ease-in-out;
}

@keyframes spinPhone {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-90deg); }
}

.rotate-card h2 {
  font-size: 20px;
  font-weight: 900;
  color: #2f3542;
  margin: 12px 0 6px 0;
}

.rotate-card p {
  font-size: 14px;
  color: #747d8c;
  font-weight: 700;
}

/* 진영별 배경 */
.player-zone {
  flex: 1;
  height: 100%;
  position: relative;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 🍓 1P 딸기팀 배경: 은은한 노을 핑크~선명한 딸기 레드 */
.p1-zone {
  background: linear-gradient(180deg, #ff9aa2 0%, #ff6b81 50%, #ee5253 100%);
}

/* 🍉 2P 수박팀 배경: 맑은 파스텔 하늘~시원한 청량 블루 */
.p2-zone {
  background: linear-gradient(180deg, #a0c4ff 0%, #70a1ff 50%, #1e90ff 100%);
}

/* ☁️ 하늘 구름 및 데코 레이어 */
.sky-decor-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.sun-glow {
  position: absolute;
  top: -70px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.45;
}
.p1-glow {
  left: 20px;
  background: radial-gradient(circle, #fff176 0%, rgba(255, 241, 118, 0) 70%);
}
.p2-glow {
  right: 20px;
  background: radial-gradient(circle, #ffffff 0%, rgba(255, 255, 255, 0) 70%);
}

.floating-cloud {
  position: absolute;
  font-size: 58px;
  opacity: 0.38;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08));
  user-select: none;
}

/* 1P 구름 포지션 및 개별 주기 */
.cloud-a1 {
  top: 14%;
  left: 8%;
  font-size: 64px;
  animation: floatCloudGentle 7s infinite ease-in-out;
}
.cloud-a2 {
  bottom: 22%;
  left: 28%;
  font-size: 48px;
  opacity: 0.28;
  animation: floatCloudGentle 9s infinite ease-in-out reverse;
}
.cloud-a3 {
  top: 52%;
  left: 4%;
  font-size: 52px;
  animation: floatCloudGentle 8s infinite ease-in-out 1s;
}

/* 2P 구름 포지션 및 개별 주기 */
.cloud-b1 {
  top: 16%;
  right: 12%;
  font-size: 66px;
  animation: floatCloudGentle 8.5s infinite ease-in-out;
}
.cloud-b2 {
  bottom: 20%;
  right: 30%;
  font-size: 50px;
  opacity: 0.28;
  animation: floatCloudGentle 7.5s infinite ease-in-out reverse;
}
.cloud-b3 {
  top: 54%;
  right: 6%;
  font-size: 54px;
  animation: floatCloudGentle 9s infinite ease-in-out 1.5s;
}

@keyframes floatCloudGentle {
  0% { transform: translateY(0) translateX(0) scale(1); }
  50% { transform: translateY(-14px) translateX(10px) scale(1.04); }
  100% { transform: translateY(0) translateX(0) scale(1); }
}

.floating-star {
  position: absolute;
  font-size: 24px;
  opacity: 0.5;
  animation: twinkleStar 2s infinite ease-in-out alternate;
}
.star-1 { top: 38%; left: 40%; }
.star-2 { top: 35%; right: 42%; }

@keyframes twinkleStar {
  0% { transform: scale(0.8); opacity: 0.25; }
  100% { transform: scale(1.2); opacity: 0.75; }
}

.player-hud {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 20;
  position: relative;
}

.p2-zone .player-hud {
  justify-content: flex-end;
}

.p-tag {
  font-size: 17px;
  font-weight: 900;
  padding: 6px 14px;
  border-radius: 999px;
  color: white;
  border: 2px solid white;
}

.p1-tag { background: #d63031; }
.p2-tag { background: #0984e3; }

.score-pill {
  font-size: 22px;
  font-weight: 900;
  padding: 6px 18px;
  border-radius: 999px;
  background: #ffffff;
  border: 3px solid #ffeb3b;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.p1-score { color: #d63031; }
.p2-score { color: #0984e3; }

/* 중앙 분할 라인 및 VS 배지 */
.split-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 4px;
  background: rgba(255, 255, 255, 0.7);
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vs-badge {
  background: #2f3542;
  color: #ffeb3b;
  font-weight: 900;
  font-size: 16px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.vs-burst {
  background: #ff3838;
  color: #ffffff;
  animation: pulseVs 0.5s infinite alternate;
}

@keyframes pulseVs {
  from { transform: scale(1); }
  to { transform: scale(1.18); }
}

/* 상단 중앙 컨트롤러 */
.center-header {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.85);
  padding: 3px;
  border-radius: 999px;
}

.mode-btn {
  border: none;
  background: transparent;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.mode-btn.active {
  background: #ff4757;
  color: white;
}

.timer-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 5px 14px;
  border-radius: 999px;
  border: 3px solid #ff6b81;
  font-size: 17px;
  font-weight: 900;
  color: #2f3542;
}

.timer-badge.urgent {
  background: #ff4757;
  color: white;
  animation: shake 0.4s infinite ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-6deg); }
  75% { transform: rotate(6deg); }
}

/* 비누방울 타겟 */
.bubbles-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 25;
}

.bubble-item {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.15s ease-out;
  animation: wobble 2s infinite ease-in-out;
}

@keyframes wobble {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.08); }
}

.bubble-core {
  width: 84%;
  height: 84%;
  border-radius: 50%;
  background: #ffffff;
  overflow: hidden;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-img {
  width: 90%;
  height: 90%;
  object-fit: cover;
}

.bubble-glass-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.9);
}

.bubble-p1 .bubble-glass-rim {
  box-shadow: 0 4px 14px rgba(255, 71, 87, 0.35);
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 118, 117, 0.25) 100%);
}

.bubble-p2 .bubble-glass-rim {
  box-shadow: 0 4px 14px rgba(9, 132, 227, 0.35);
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(116, 185, 255, 0.25) 100%);
}

.bubble-highlight {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 22%;
  height: 22%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  filter: blur(1.5px);
}

.bubble-item.pop {
  transform: translate(-50%, -50%) scale(1.4) !important;
  opacity: 0;
  transition: transform 0.16s ease-out, opacity 0.16s ease-out;
}

/* 부스터 오버레이 */
.booster-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255, 71, 87, 0.15) 0%, rgba(255, 165, 2, 0.3) 100%);
  animation: flashBooster 0.4s infinite alternate;
  z-index: 15;
}

@keyframes flashBooster {
  from { opacity: 0.3; }
  to { opacity: 0.8; }
}

.score-float {
  position: fixed;
  font-size: 26px;
  font-weight: 900;
  text-shadow: 2px 2px 0 #ffffff;
  pointer-events: none;
  z-index: 999;
  animation: floatUp 0.6s ease-out forwards;
}

.p1-text { color: #d63031; }
.p2-text { color: #0984e3; }

@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -15px) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -40px) scale(1); opacity: 0; }
}

.sparkle-particle {
  position: fixed;
  font-size: 22px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.55s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3); opacity: 0; }
}

/* 결과 모달 */
.result-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.result-card {
  background: #ffffff;
  border-radius: 32px;
  padding: 28px 32px;
  text-align: center;
  border: 5px solid #ffeb3b;
  max-width: 400px;
  width: 90%;
  animation: bounceIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.result-icon { font-size: 54px; }
.result-title { font-size: 24px; font-weight: 900; color: #2f3542; margin: 8px 0 16px 0; }

.vs-final-board {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 14px;
}

.final-player {
  padding: 10px 18px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
}

.p1-box { background: #ffeaa7; border: 3px solid #ff7675; }
.p2-box { background: #dfe6e9; border: 3px solid #74b9ff; }
.final-vs { font-size: 28px; font-weight: 900; color: #747d8c; }
.p-name { font-size: 13px; font-weight: 800; }
.p-score { font-size: 30px; font-weight: 900; color: #2f3542; }

.result-subtext { font-size: 14px; font-weight: 800; color: #747d8c; margin-bottom: 18px; }

.cute-btn {
  background-color: #ff4757;
  color: white;
  border: 3px solid #ffffff;
  padding: 10px 24px;
  font-size: 18px;
  font-weight: 800;
  border-radius: 999px;
  cursor: pointer;
  width: 100%;
}
</style>