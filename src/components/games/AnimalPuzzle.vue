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

// 8가지 도형 목록 (초승달을 도톰하고 캐릭터가 잘 보이도록 수정)
const SHAPES = [
  { id: 'circle', name: '동그라미', clip: 'circle(50% at 50% 50%)' },
  { id: 'triangle', name: '삼각형', clip: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { id: 'square', name: '네모', clip: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
  { id: 'pentagon', name: '오각형', clip: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' },
  { id: 'hexagon', name: '육각형', clip: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  { id: 'diamond', name: '마름모', clip: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { id: 'star', name: '별', clip: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  // 🌙 도톰하고 통통한 초승달 모양
  // { id: 'crescent', name: '초승달', clip: 'path("M 50 0 A 50 50 0 1 0 100 85 A 48 48 0 1 1 50 0 Z")' }
];

// 게임 상태
const currentPieces = ref([]); // 현재 화면의 퍼즐 목록 (2~4개)
const showCelebration = ref(false);
const isTimeOver = ref(false);
const sparkles = ref([]);
const soundLabels = ref([]);

// 10초 타이머
const timeLeft = ref(10);
const isWarning = ref(false);
let timer = null;

// 드래그 제어
let activeDragId = null;
let dragOffset = { x: 0, y: 0 };
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq = 523.25) {
  try {
    initAudio();
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
    initAudio();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => playTone(freq), idx * 80);
    });
  } catch (e) {}
}

function playTick() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playSadTone() {
  try {
    initAudio();
    [440, 392, 349, 329].forEach((freq, idx) => {
      setTimeout(() => playTone(freq), idx * 110);
    });
  } catch (e) {}
}

function spawnSparkles(x, y) {
  const icons = ['✨', '⭐', '💖', '🎉', '🌟'];
  const newSparkles = Array.from({ length: 10 }).map(() => ({
    id: Math.random(),
    icon: icons[Math.floor(Math.random() * icons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 160}px`,
    ty: `${(Math.random() - 0.5) * 160}px`
  }));
  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 600);
}

// 2~4개 무작위 퍼즐 생성 및 최소 20px 이상 간격 확보 배치
function generatePuzzles() {
  const count = Math.floor(Math.random() * 3) + 2; // 2 ~ 4개 랜덤
  const shuffledItems = [...PUZZLE_ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
  const shuffledShapes = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, count);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const pieceSize = 168; // 커진 퍼즐 크기
  const minGap = 20; // 최소 20px 이상 간격 유지

  // 상단 실루엣 슬롯 X좌표 분할 계산
  const silSectionWidth = width / count;
  const placedPieces = [];

  for (let i = 0; i < count; i++) {
    const item = shuffledItems[i];
    const shape = shuffledShapes[i];

    // 1. 실루엣 좌표 (상단 24% ~ 38% 영역)
    const slotX = silSectionWidth * i + silSectionWidth / 2;
    const silY = height * (0.24 + (i % 2 === 0 ? 0 : 0.08));

    // 2. 하단 조각 좌표 (충돌 방지 알고리즘 적용: 다른 조각과 중심 간격 최소 pieceSize + minGap 확보)
    let pieceX = 0;
    let pieceY = 0;
    let attempts = 0;
    const minDist = pieceSize + minGap;

    while (attempts < 50) {
      const pMinX = width * 0.15;
      const pMaxX = width * 0.85;
      const pMinY = height * 0.68;
      const pMaxY = height * 0.84;

      pieceX = Math.floor(Math.random() * (pMaxX - pMinX) + pMinX);
      pieceY = Math.floor(Math.random() * (pMaxY - pMinY) + pMinY);

      // 이미 배치된 조각들과의 거리 검사
      const isOverlap = placedPieces.some(p => {
        const dx = p.piecePos.x - pieceX;
        const dy = p.piecePos.y - pieceY;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });

      if (!isOverlap || attempts === 49) {
        break;
      }
      attempts++;
    }

    placedPieces.push({
      uid: Math.random(),
      item,
      shape,
      isMatched: false,
      silhouettePos: { x: slotX, y: silY },
      piecePos: { x: pieceX, y: pieceY }
    });
  }

  currentPieces.value = placedPieces;
}

// 10초 타이머
function startTimer() {
  if (timer) clearInterval(timer);
  timeLeft.value = 10;
  isWarning.value = false;
  isTimeOver.value = false;

  timer = setInterval(() => {
    timeLeft.value -= 1;

    if (timeLeft.value <= 3 && timeLeft.value > 0) {
      isWarning.value = true;
      playTick();
    }

    if (timeLeft.value <= 0) {
      clearInterval(timer);
      handleTimeOver();
    }
  }, 1000);
}

function handleTimeOver() {
  isTimeOver.value = true;
  isWarning.value = false;
  playSadTone();
}

function startRound() {
  showCelebration.value = false;
  isTimeOver.value = false;
  generatePuzzles();
  startTimer();
}

// 터치 및 드래그 인터랙션
function onPointerDown(piece, e) {
  if (piece.isMatched || isTimeOver.value) return;
  activeDragId = piece.uid;

  const clientX = e.clientX || e.touches?.[0]?.clientX;
  const clientY = e.clientY || e.touches?.[0]?.clientY;

  dragOffset.x = clientX - piece.piecePos.x;
  dragOffset.y = clientY - piece.piecePos.y;
}

function onPointerMove(e) {
  if (!activeDragId || isTimeOver.value) return;

  const piece = currentPieces.value.find(p => p.uid === activeDragId);
  if (!piece || piece.isMatched) return;

  const clientX = e.clientX || e.touches?.[0]?.clientX;
  const clientY = e.clientY || e.touches?.[0]?.clientY;

  piece.piecePos.x = clientX - dragOffset.x;
  piece.piecePos.y = clientY - dragOffset.y;
}

function onPointerUp() {
  if (!activeDragId) return;

  const piece = currentPieces.value.find(p => p.uid === activeDragId);
  if (piece && !piece.isMatched) {
    const dx = piece.piecePos.x - piece.silhouettePos.x;
    const dy = piece.piecePos.y - piece.silhouettePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 커진 크기에 맞춰 스냅 반경을 95px로 확대
    if (distance < 95) {
      piece.piecePos = { ...piece.silhouettePos };
      piece.isMatched = true;
      triggerPieceSuccess(piece);
    }
  }

  activeDragId = null;
}

function triggerPieceSuccess(piece) {
  playTone(659.25);
  spawnSparkles(piece.silhouettePos.x, piece.silhouettePos.y);

  const labelId = Math.random();
  soundLabels.value.push({
    id: labelId,
    text: piece.item.sound,
    x: piece.silhouettePos.x,
    y: Math.max(70, piece.silhouettePos.y - 90)
  });

  setTimeout(() => {
    soundLabels.value = soundLabels.value.filter(l => l.id !== labelId);
  }, 1000);

  const isAllCleared = currentPieces.value.every(p => p.isMatched);
  if (isAllCleared) {
    clearInterval(timer);
    isWarning.value = false;
    showCelebration.value = true;
    playFanfare();

    setTimeout(() => {
      startRound();
    }, 2000);
  }
}

onMounted(async () => {
  await nextTick();
  startRound();

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <div class="puzzle-view" :class="{ 'warning-flash': isWarning }">
    <!-- 상단 헤더 & 모래시계 타이머 -->
    <header class="puzzle-header">
      <div class="header-content">
        <div class="title-pill">
          <span class="icon">🧩</span>
          <h1>프랑수아 일상 퍼즐</h1>
          <span class="icon">✨</span>
        </div>
        
        <!-- 모래시계 타이머 -->
        <div class="timer-badge" :class="{ 'timer-urgent': timeLeft <= 3 }">
          <span class="hourglass-icon">⏳</span>
          <span class="time-text">{{ timeLeft }}초</span>
        </div>
      </div>
      <p class="guide-text">그림자 모양에 맞춰 쏙 넣어보세요!</p>
    </header>

    <!-- 퍼즐 무대 -->
    <main class="puzzle-stage">
      <template v-for="piece in currentPieces" :key="piece.uid">
        <!-- 1. 정답 실루엣 틀 (크기 1.35배 확대) -->
        <div
          class="silhouette-slot"
          :style="{ left: piece.silhouettePos.x + 'px', top: piece.silhouettePos.y + 'px' }"
        >
          <div
            class="slot-shape-mask"
            :style="{ clipPath: piece.shape.clip, WebkitClipPath: piece.shape.clip }"
          >
            <img
              :src="piece.item.image"
              alt="그림자 도안"
              class="silhouette-img"
              draggable="false"
            />
          </div>
          <div
            class="slot-dashed-outline"
            :style="{ clipPath: piece.shape.clip, WebkitClipPath: piece.shape.clip }"
          ></div>
        </div>

        <!-- 2. 드래그 퍼즐 조각 (크기 1.35배 확대) -->
        <div
          class="puzzle-piece"
          :class="{ matched: piece.isMatched }"
          :style="{
            left: piece.piecePos.x + 'px',
            top: piece.piecePos.y + 'px',
            clipPath: piece.shape.clip,
            WebkitClipPath: piece.shape.clip
          }"
          @pointerdown="onPointerDown(piece, $event)"
        >
          <div class="piece-shape-mask">
            <img
              :src="piece.item.image"
              alt="퍼즐 조각"
              class="piece-img"
              draggable="false"
            />
          </div>
        </div>
      </template>
    </main>

    <!-- 참 잘했어요 축하 팝업 -->
    <Transition name="bounce">
      <div v-if="showCelebration" class="celebration-popup">
        <div class="celebration-card">
          <span class="cheer-emoji">🎉</span>
          <span class="cheer-text">참 잘했어요!</span>
        </div>
      </div>
    </Transition>

    <!-- 제한시간 초과 재도전 모달 -->
    <Transition name="bounce">
      <div v-if="isTimeOver" class="modal-backdrop">
        <div class="retry-card">
          <div class="clap-icon">👏</div>
          <h2 class="retry-title">정말 아쉽네요.</h2>
          <p class="retry-subtext">다시 한 번 도전해볼까요? (박수)</p>
          <button class="retry-btn" @click="startRound">다시 하기! 🚀</button>
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

    <!-- 터치 별가루 파티클 -->
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

.warning-flash {
  animation: bgFlash 0.5s infinite alternate ease-in-out;
}

@keyframes bgFlash {
  0% { background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); }
  100% { background: linear-gradient(135deg, #ff7675 0%, #d63031 100%); }
}

/* 상단 헤더 & 컨트롤 */
.puzzle-header {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  width: 100%;
  padding: 0 16px;
  box-sizing: border-box;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  padding: 8px 20px;
  border-radius: 999px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.title-pill h1 {
  font-size: 19px;
  font-weight: 900;
  color: #ff4757;
  margin: 0;
}

/* 모래시계 타이머 */
.timer-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  padding: 6px 16px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  border: 2px solid #ff7675;
  font-weight: 900;
  color: #2f3542;
  font-size: 17px;
}

.timer-badge.timer-urgent {
  background: #ff4757;
  color: #ffffff;
  border-color: #ffffff;
  animation: shakeUrgent 0.35s infinite ease-in-out;
}

.hourglass-icon {
  display: inline-block;
  animation: flipHourglass 2s infinite ease-in-out;
}

@keyframes flipHourglass {
  0%, 45% { transform: rotate(0deg); }
  50%, 95% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}

@keyframes shakeUrgent {
  0%, 100% { transform: rotate(0deg) scale(1.05); }
  25% { transform: rotate(-6deg) scale(1.1); }
  75% { transform: rotate(6deg) scale(1.1); }
}

.guide-text {
  font-size: 15px;
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

/* 1. 정답 실루엣 틀 (175px로 확대) */
.silhouette-slot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 175px;
  height: 175px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slot-shape-mask {
  width: 165px;
  height: 165px;
  background: rgba(0, 0, 0, 0.22);
  display: flex;
  justify-content: center;
  align-items: center;
}

.silhouette-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0) opacity(0.35);
  pointer-events: none;
}

.slot-dashed-outline {
  position: absolute;
  width: 173px;
  height: 173px;
  background: rgba(255, 118, 117, 0.45);
  pointer-events: none;
  z-index: -1;
}

/* 2. 드래그 퍼즐 조각 (168px로 확대) */
.puzzle-piece {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 168px;
  height: 168px;
  background: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
  transition: transform 0.08s ease;
}

.puzzle-piece:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.1);
}

.puzzle-piece.matched {
  animation: popSuccess 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}

@keyframes popSuccess {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

.piece-shape-mask {
  width: 100%;
  height: 100%;
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

/* 팝업 모달 */
.modal-backdrop, .celebration-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.celebration-card, .retry-card {
  background: #ffffff;
  border-radius: 32px;
  padding: 24px 32px;
  text-align: center;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.celebration-card {
  border: 5px solid #fdcb6e;
  flex-direction: row;
  gap: 12px;
}

.retry-card {
  border: 5px solid #ff7675;
  max-width: 320px;
  width: 82%;
}

.cheer-emoji, .clap-icon { font-size: 44px; }
.clap-icon { animation: clapBounce 0.8s infinite alternate; }

@keyframes clapBounce {
  0% { transform: scale(0.9) rotate(-6deg); }
  100% { transform: scale(1.15) rotate(6deg); }
}

.cheer-text { font-size: 26px; font-weight: 900; color: #ff4757; }
.retry-title { font-size: 23px; font-weight: 900; color: #ff4757; margin: 10px 0 6px 0; }
.retry-subtext { font-size: 16px; font-weight: 800; color: #636e72; margin-bottom: 20px; }

.retry-btn {
  background: #ff4757;
  color: #ffffff;
  font-size: 19px;
  font-weight: 900;
  border: none;
  padding: 12px 30px;
  border-radius: 999px;
  box-shadow: 0 4px 0 #d63031;
  cursor: pointer;
}

.retry-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #d63031;
}

/* 말풍선 & 파티클 */
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
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 100;
  animation: floatUp 0.85s ease-out forwards;
}

@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -20px) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -45px) scale(1); opacity: 0; }
}

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

.bounce-enter-active { animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.bounce-leave-active { transition: opacity 0.25s; }
.bounce-leave-to { opacity: 0; }

@keyframes popIn {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>