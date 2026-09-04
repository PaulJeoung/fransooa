<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 1. 13개 카테고리 정의
const THEMES = [
  { key: 'babyshark', name: '아기상어', icon: '🦈' },
  { key: 'pororo', name: '뽀로로', icon: '🐧' },
  { key: 'tayo', name: '타요', icon: '🚌' },
  { key: 'africa', name: '아프리카', icon: '🦁' },
  { key: 'zoo', name: '동물원', icon: '🦒' },
  { key: 'farm', name: '농장 친구들', icon: '🐮' },
  { key: 'new_farm', name: '햇살 농장', icon: '🐑' },
  { key: 'sea', name: '바닷속 세상', icon: '🐙' },
  { key: 'poles', name: '남극/북극', icon: '🐻‍❄️' },
  { key: 'korea', name: '한국 친구들', icon: '🐯' },
  { key: 'austrailla', name: '호주 동물', icon: '🦘' },
  { key: 'northamerica', name: '북아메리카', icon: '🦅' },
  { key: 'southamerica', name: '남아메리카', icon: '🦙' }
];

function getThemeImages(themeKey) {
  return Array.from({ length: 9 }, (_, i) => `/images/character_world/character_${themeKey}_${i + 1}.png`);
}

// 게임 제어 상태
const currentThemeKey = ref('all');
const activeThemeName = ref('랜덤 월드');
const currentGrid = ref(2); // 2(2x2), 3(3x3), 4(4x4)
const selectedTimeMode = ref(30); // 30초 또는 60초
const timeLeft = ref(30);
const isPlaying = ref(false);
const isPreviewing = ref(false); // 정답 사전 노출 중 여부
const previewCountdown = ref(0);  // 사전 노출 잔여 시간
const isGameOver = ref(false);
const isGameClear = ref(false);
const isWarning = ref(false);

const cards = ref([]);
const flippedCards = ref([]);
const isLock = ref(false);
const matchedCount = ref(0);
const sparkles = ref([]);

let gameTimer = null;
let previewTimer = null;
let audioCtx = null;

// --- 오디오 시스템 ---
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playFlipSound() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playMatchSound() {
  try {
    initAudio();
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      }, idx * 80);
    });
  } catch (e) {}
}

function playMismatchSound() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch (e) {}
}

function playWarningTick() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playFanfare() {
  try {
    initAudio();
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    const delays = [0, 100, 200, 320, 460, 600];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }, delays[i]);
    });
  } catch (e) {}
}

function triggerSparkles(x, y) {
  const icons = ['✨', '⭐', '💖', '🎉', '🌟'];
  const newSparkles = Array.from({ length: 8 }).map(() => ({
    id: Math.random(),
    icon: icons[Math.floor(Math.random() * icons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 140}px`,
    ty: `${(Math.random() - 0.5) * 140}px`
  }));
  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 650);
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 보드 초기화 (모든 카드를 앞면으로 펼친 상태로 시작)
function setupBoard() {
  flippedCards.value = [];
  isLock.value = true;
  matchedCount.value = 0;

  let targetTheme;
  if (currentThemeKey.value === 'all') {
    targetTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
  } else {
    targetTheme = THEMES.find(t => t.key === currentThemeKey.value) || THEMES[0];
  }
  activeThemeName.value = `${targetTheme.icon} ${targetTheme.name}`;

  const themeImages = getThemeImages(targetTheme.key);
  const totalCells = currentGrid.value * currentGrid.value;
  const isOdd = totalCells % 2 !== 0;
  const pairCount = Math.floor(totalCells / 2);

  const pool = shuffleArray(themeImages).slice(0, pairCount);

  let deck = [];
  pool.forEach((img, idx) => {
    deck.push({ id: `p${idx}-1`, img, isFlipped: true, isMatched: false, isJoker: false });
    deck.push({ id: `p${idx}-2`, img, isFlipped: true, isMatched: false, isJoker: false });
  });

  if (isOdd) {
    const remainingImg = themeImages.find(img => !pool.includes(img)) || themeImages[0];
    deck.push({
      id: 'joker-bonus',
      img: remainingImg,
      isFlipped: true,
      isMatched: true,
      isJoker: true
    });
  }

  cards.value = shuffleArray(deck);
}

// 카드 터치 핸들러
function flipCard(card, event) {
  if (!isPlaying.value || isPreviewing.value || isLock.value || card.isFlipped || card.isMatched || card.isJoker) return;

  playFlipSound();
  card.isFlipped = true;
  flippedCards.value.push(card);

  if (flippedCards.value.length === 2) {
    checkMatch(event);
  }
}

// 짝 일치 판정
function checkMatch(event) {
  isLock.value = true;
  const [first, second] = flippedCards.value;

  if (first.img === second.img) {
    setTimeout(() => {
      first.isMatched = true;
      second.isMatched = true;
      matchedCount.value += 1;
      playMatchSound();

      const rect = event?.target?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      triggerSparkles(x, y);

      flippedCards.value = [];
      isLock.value = false;

      const totalPairs = Math.floor((currentGrid.value * currentGrid.value) / 2);
      if (matchedCount.value >= totalPairs) {
        finishGame(true);
      }
    }, 350);
  } else {
    setTimeout(() => {
      playMismatchSound();
      first.isFlipped = false;
      second.isFlipped = false;
      flippedCards.value = [];
      isLock.value = false;
    }, 850);
  }
}

// 본 게임 제한시간 타이머
function startTimer() {
  if (gameTimer) clearInterval(gameTimer);
  timeLeft.value = selectedTimeMode.value;
  isWarning.value = false;

  gameTimer = setInterval(() => {
    timeLeft.value -= 1;

    if (timeLeft.value <= 5 && timeLeft.value > 0) {
      isWarning.value = true;
      playWarningTick();
    }

    if (timeLeft.value <= 0) {
      finishGame(false);
    }
  }, 1000);
}

// 사전 노출(2초 / 3초) 후 카드를 뒤집고 게임 & 타이머 시작
function startPreviewCountdown() {
  if (previewTimer) clearInterval(previewTimer);
  if (gameTimer) clearInterval(gameTimer);

  // 2x2, 3x3은 2초, 4x4는 3초 노출
  const previewDuration = currentGrid.value === 4 ? 3 : 2;
  previewCountdown.value = previewDuration;
  isPreviewing.value = true;
  isLock.value = true;
  timeLeft.value = selectedTimeMode.value; // 타이머는 아직 줄어들지 않음

  previewTimer = setInterval(() => {
    previewCountdown.value -= 1;

    if (previewCountdown.value <= 0) {
      clearInterval(previewTimer);
      isPreviewing.value = false;

      // 조커를 제외한 모든 카드를 뒷면으로 뒤집기
      cards.value.forEach(c => {
        if (!c.isJoker) {
          c.isFlipped = false;
        }
      });
      isLock.value = false;

      // 카드가 뒤집힌 시점부터 타이머 가동
      startTimer();
    }
  }, 1000);
}

function finishGame(cleared) {
  if (gameTimer) clearInterval(gameTimer);
  if (previewTimer) clearInterval(previewTimer);
  isPlaying.value = false;
  isPreviewing.value = false;
  isWarning.value = false;
  isGameClear.value = cleared;
  isGameOver.value = true;
  playFanfare();
}

function startGame() {
  if (gameTimer) clearInterval(gameTimer);
  if (previewTimer) clearInterval(previewTimer);
  isGameOver.value = false;
  isGameClear.value = false;
  isWarning.value = false;
  isPlaying.value = true;

  setupBoard();
  startPreviewCountdown();
}

function setGrid(size) {
  currentGrid.value = size;
  startGame();
}

function setTimeMode(sec) {
  selectedTimeMode.value = sec;
  startGame();
}

function setTheme(themeKey) {
  currentThemeKey.value = themeKey;
  startGame();
}

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  if (gameTimer) clearInterval(gameTimer);
  if (previewTimer) clearInterval(previewTimer);
});
</script>

<template>
  <div class="game-view match-bg" :class="{ 'warning-flash': isWarning }">
    <!-- 상단 제어 바 -->
    <header class="game-header">
      <!-- 1. 난이도 (2x2, 3x3, 4x4) -->
      <div class="pill-badge grid-badge">
        <button
          v-for="grid in [2, 3, 4]"
          :key="grid"
          class="control-btn"
          :class="{ active: currentGrid === grid }"
          @click="setGrid(grid)"
        >
          {{ grid }}×{{ grid }}
        </button>
      </div>

      <!-- 2. 시간 (30초, 60초) -->
      <div class="pill-badge time-mode-badge">
        <button
          class="control-btn"
          :class="{ active: selectedTimeMode === 30 }"
          @click="setTimeMode(30)"
        >
          30초
        </button>
        <button
          class="control-btn"
          :class="{ active: selectedTimeMode === 60 }"
          @click="setTimeMode(60)"
        >
          60초
        </button>
      </div>

      <!-- 3. 우측 상단 모래시계 타이머 -->
      <div class="timer-badge" :class="{ urgent: timeLeft <= 5 && !isPreviewing }">
        <span class="hourglass-spin">⏳</span>
        <span class="time-text">{{ timeLeft }}초</span>
      </div>
    </header>

    <!-- 테마 및 사전 노출 안내 표시줄 -->
    <div class="theme-bar-container">
      <div class="active-theme-pill">
        <span>테마:</span>
        <strong>{{ activeThemeName }}</strong>
      </div>

      <!-- 사전 노출 카운트다운 알림 배지 -->
      <div v-if="isPreviewing" class="preview-notice-badge">
        <span>👀 눈 크게 뜨고 기억해요!</span>
        <strong class="countdown-num">{{ previewCountdown }}초</strong>
      </div>

      <select
        class="theme-select-dropdown"
        :value="currentThemeKey"
        @change="setTheme($event.target.value)"
      >
        <option value="all">🎲 랜덤 테마</option>
        <option v-for="t in THEMES" :key="t.key" :value="t.key">
          {{ t.icon }} {{ t.name }}
        </option>
      </select>
    </div>

    <!-- 배경 구름 데코 -->
    <div class="cloud cloud-1">☁️</div>
    <div class="cloud cloud-2">☁️</div>

    <!-- 카드 격자 스테이지 -->
    <main class="board-stage">
      <div
        class="card-grid"
        :class="`grid-${currentGrid}`"
      >
        <div
          v-for="card in cards"
          :key="card.id"
          class="card-item"
          :class="{
            flipped: card.isFlipped,
            matched: card.isMatched,
            joker: card.isJoker
          }"
          @pointerdown="flipCard(card, $event)"
        >
          <div class="card-inner">
            <!-- 뒷면 -->
            <div class="card-face card-back">
              <span class="back-icon">❓</span>
            </div>

            <!-- 앞면 -->
            <div class="card-face card-front">
              <div v-if="card.isJoker" class="joker-badge">보너스 ⭐</div>
              <img
                :src="card.img"
                class="card-char-img"
                draggable="false"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 5초 임박 붉은 플래시 오버레이 -->
    <div v-if="isWarning" class="warning-overlay"></div>

    <!-- 별가루 파티클 -->
    <div
      v-for="s in sparkles"
      :key="s.id"
      class="sparkle-particle"
      :style="{
        left: s.x + 'px',
        top: s.y + 'px',
        '--tx': s.tx,
        '--ty': s.ty
      }"
    >
      {{ s.icon }}
    </div>

    <!-- 칭찬 팝업 -->
    <Transition name="bounce-pop">
      <div v-if="isGameOver" class="modal-backdrop">
        <div class="modal-card">
          <div class="thumb-emoji">👍</div>
          <h2 class="modal-title">
            {{ isGameClear ? '우와! 짝을 다 찾았어요! 🎉' : '괜찮아요! 너무 잘했어요! 🌟' }}
          </h2>
          <div class="praise-banner">
            <span class="praise-large">최고야! 엄지척! 👍</span>
          </div>
          <p class="modal-subtext">
            {{ isGameClear ? '정말 대단해요! 기억력이 쑥쑥 늘었어요!' : '포기하지 않고 씩씩하게 도전한 우리 친구 최고!' }}
          </p>
          <button class="cute-restart-btn" @click="startGame">
            한 번 더 하기! 🚀
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.match-bg {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #a1c4fd 0%, #c2e9fb 50%, #fed6e3 100%);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  display: flex;
  flex-direction: column;
}

.warning-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 59, 48, 0.25);
  pointer-events: none;
  z-index: 80;
  animation: flashRed 0.5s infinite alternate ease-in-out;
}

@keyframes flashRed {
  0% { opacity: 0.2; }
  100% { opacity: 0.9; }
}

.game-header {
  position: relative;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px 6px 18px;
  width: 100%;
  box-sizing: border-box;
  gap: 8px;
}

.pill-badge {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  padding: 4px 6px;
  border-radius: 999px;
  display: flex;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid #ffffff;
}

.control-btn {
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 900;
  color: #2d3436;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn.active {
  background: #ff4757;
  color: #ffffff;
  box-shadow: 0 3px 0 #c2185b;
}

.theme-bar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 18px;
  z-index: 90;
  gap: 8px;
}

.active-theme-pill {
  font-size: 13px;
  font-weight: 800;
  color: #2f3542;
  background: rgba(255, 255, 255, 0.7);
  padding: 4px 12px;
  border-radius: 999px;
  display: flex;
  gap: 6px;
  align-items: center;
}

/* 정답 기억하기 안내 배지 */
.preview-notice-badge {
  background: #ff4757;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  padding: 5px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(255, 71, 87, 0.35);
  display: flex;
  align-items: center;
  gap: 6px;
  animation: pulseNotice 0.8s infinite alternate ease-in-out;
}

@keyframes pulseNotice {
  0% { transform: scale(0.96); }
  100% { transform: scale(1.05); }
}

.countdown-num {
  background: #ffffff;
  color: #ff4757;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 13px;
}

.theme-select-dropdown {
  background: #ffffff;
  border: 2px solid #ff7675;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
  color: #2d3436;
  outline: none;
  cursor: pointer;
}

.timer-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  padding: 6px 16px;
  border-radius: 999px;
  border: 3px solid #ff7675;
  box-shadow: 0 4px 0 #dfe4ea, 0 6px 14px rgba(0, 0, 0, 0.1);
  color: #2d3436;
  font-size: 18px;
  font-weight: 900;
}

.timer-badge.urgent {
  background: #ff4757;
  color: #ffffff;
  border-color: #ffffff;
  box-shadow: 0 4px 0 #c2185b;
  animation: shake 0.4s infinite ease-in-out;
}

.hourglass-spin {
  display: inline-block;
  animation: rotateHourglass 2s infinite cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

@keyframes rotateHourglass {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg) scale(1.04); }
  25% { transform: rotate(-5deg) scale(1.08); }
  75% { transform: rotate(5deg) scale(1.08); }
}

.cloud {
  position: absolute;
  font-size: 55px;
  opacity: 0.5;
  pointer-events: none;
}
.cloud-1 { top: 12%; left: 6%; animation: floatCloud 20s infinite linear; }
.cloud-2 { top: 22%; right: 8%; animation: floatCloud 24s infinite linear reverse; }

@keyframes floatCloud {
  0% { transform: translateX(-30px); }
  50% { transform: translateX(30px); }
  100% { transform: translateX(-30px); }
}

.board-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  z-index: 10;
}

.card-grid {
  display: grid;
  gap: 10px;
  width: min(88vw, 450px);
  height: min(88vw, 450px);
  max-height: 64vh;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 7px;
}

.card-item {
  perspective: 1000px;
  cursor: pointer;
  touch-action: manipulation;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.card-item.flipped .card-inner,
.card-item.matched .card-inner,
.card-item.joker .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.card-back {
  background: radial-gradient(circle, #ff9ff3 0%, #feca57 100%);
  border: 4px solid #ffffff;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12), 0 3px 0 #ff9f43;
}

.back-icon {
  font-size: clamp(22px, 5.5vw, 38px);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.card-front {
  background: #ffffff;
  border: 4px solid #54a0ff;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12), 0 3px 0 #2e86de;
  transform: rotateY(180deg);
  overflow: hidden;
  padding: 6px;
}

.card-char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  pointer-events: none;
}

.card-item.matched {
  animation: matchBounce 0.4s ease-out;
}

@keyframes matchBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.card-item.matched .card-front {
  border-color: #2ed573;
  box-shadow: 0 6px 14px rgba(46, 213, 115, 0.3), 0 3px 0 #26af5f;
}

.card-item.joker .card-front {
  border-color: #f1c40f;
  background: #fff9c4;
}

.joker-badge {
  position: absolute;
  top: 4px;
  font-size: 11px;
  font-weight: 900;
  background: #f1c40f;
  color: #2d3436;
  padding: 2px 6px;
  border-radius: 8px;
  z-index: 2;
}

.sparkle-particle {
  position: fixed;
  font-size: 26px;
  pointer-events: none;
  z-index: 9999;
  animation: burst 0.65s ease-out forwards;
}

@keyframes burst {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.4); opacity: 0; }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: 36px;
  padding: 30px 24px;
  text-align: center;
  border: 6px solid #feca57;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  max-width: 380px;
  width: 90%;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.thumb-emoji {
  font-size: 60px;
  animation: waveThumb 0.9s infinite alternate ease-in-out;
}

@keyframes waveThumb {
  0% { transform: scale(1) rotate(-8deg); }
  100% { transform: scale(1.2) rotate(12deg); }
}

.modal-title {
  font-size: 20px;
  font-weight: 900;
  color: #ff4757;
  margin: 10px 0;
}

.praise-banner {
  background: #fff9c4;
  border: 3px dashed #fbc02d;
  padding: 10px 16px;
  border-radius: 20px;
  margin: 10px 0 14px 0;
}

.praise-large {
  font-size: 24px;
  font-weight: 900;
  color: #e91e63;
}

.modal-subtext {
  font-size: 14px;
  font-weight: 800;
  color: #747d8c;
  line-height: 1.4;
  margin-bottom: 20px;
}

.cute-restart-btn {
  background: #ff4757;
  color: #ffffff;
  border: 4px solid #ffffff;
  padding: 12px 28px;
  font-size: 19px;
  font-weight: 900;
  border-radius: 999px;
  box-shadow: 0 5px 0 #c2185b, 0 8px 18px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  width: 100%;
}

.cute-restart-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #c2185b;
}

@media (max-width: 480px) {
  .game-header {
    padding: 8px 10px 4px 10px;
  }
  .control-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
  .timer-badge {
    padding: 5px 12px;
    font-size: 15px;
  }
  .theme-bar-container {
    padding: 0 10px;
    flex-wrap: wrap;
    gap: 4px;
  }
  .preview-notice-badge {
    order: 3;
    width: 100%;
    justify-content: center;
    padding: 4px 10px;
  }
}
</style>