<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 1. /public/images/trace/ 아이콘 파일 목록 정의
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
const targets = ref([]);
const sparkles = ref([]);
const scorePops = ref([]);
const praisePops = ref([]);
const isBursting = ref(false);

let spawnTimer = null;
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

// 뿅뿅 팝 사운드 (연속 클릭 시 피치 상승)
function playPopSound() {
  try {
    initAudio();
    const now = Date.now();
    comboCount = (now - lastPopTime < 350) ? Math.min(comboCount + 1, 6) : 0;
    lastPopTime = now;

    const baseFreq = 587.33; // D5
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

// 팡파레 / 칭찬 축하 멜로디 사운드
function playPraiseSound(type) {
  try {
    initAudio();
    const notes = type === 'fanfare'
      ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (도미솔도)
      : [659.25, 880.00, 1174.66];        // E5, A5, D6 (밝은 차임)

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

// 비누방울 타겟 생성
function spawnTarget(isBurst = false) {
  if (!isPlaying.value) return;

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
  }, 5000);
}

// 10~15초 주기 방울 폭포(버스트) 연출
function triggerBubbleBurst() {
  if (!isPlaying.value) return;
  isBursting.value = true;

  // 6~9개의 비누방울을 0.1초 간격으로 연속 스폰
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

// 별가루 파티클, +1, 칭찬 말풍선 생성
function createEffects(x, y) {
  // 1. 별가루 파티클
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

  // 2. 점수 +1 팝업
  const scorePop = { id: Math.random(), x, y: y - 25 };
  scorePops.value.push(scorePop);
  setTimeout(() => {
    scorePops.value = scorePops.value.filter(sp => sp.id !== scorePop.id);
  }, 650);

  // 3. 35% 확률 또는 5의 배수 점수마다 랜덤 칭찬 팝업 및 축하 효과음
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
  if (target.isPopped) return;
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

function startGame() {
  score.value = 0;
  isPlaying.value = true;
  targets.value.forEach(t => clearInterval(t.moveInterval));
  targets.value = [];

  if (spawnTimer) clearInterval(spawnTimer);
  if (burstIntervalTimer) clearInterval(burstIntervalTimer);

  spawnTarget();
  spawnTimer = setInterval(() => spawnTarget(), 900);
  
  // 12초마다 비누방울 폭포 발동
  burstIntervalTimer = setInterval(triggerBubbleBurst, 12000);
}

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer);
  if (burstIntervalTimer) clearInterval(burstIntervalTimer);
  targets.value.forEach(t => clearInterval(t.moveInterval));
});
</script>

<template>
  <div class="game-view emoji-bg">
    <!-- 상단 점수 바 및 버스트 알림 -->
    <header class="game-header">
      <div class="score-badge">
        <span class="star-icon">⭐</span>
        <span>{{ score }}</span>
      </div>
      <div v-if="isBursting" class="burst-badge">무한 방울 발사!!</div>
      <button class="cute-btn" @click="startGame">다시하기</button>
    </header>

    <!-- 배경 둥실 구름 -->
    <div class="cloud cloud-1">☁️</div>
    <div class="cloud cloud-2">☁️</div>
    <div class="cloud cloud-3">☁️</div>

    <!-- 게임 플레이 영역 -->
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
        <!-- 둥근 원형 마스킹 코어: 네모난 흰색 PNG 배경 이질감 제거 -->
        <div class="bubble-core">
          <img :src="target.imageSrc" class="icon-img" draggable="false" />
        </div>
        <!-- 비누방울 광택 링 & 하이라이트 -->
        <div class="bubble-glass-rim"></div>
        <div class="bubble-highlight"></div>
      </div>
    </main>

    <!-- +1 점수 텍스트 -->
    <div
      v-for="sp in scorePops"
      :key="sp.id"
      class="score-float"
      :style="{ left: sp.x + 'px', top: sp.y + 'px' }"
    >
      +1
    </div>

    <!-- 랜덤 칭찬 말풍선 (빵빠레, 야호, 멋져) -->
    <div
      v-for="pr in praisePops"
      :key="pr.id"
      class="praise-float"
      :style="{ left: pr.x + 'px', top: pr.y + 'px', color: pr.color }"
    >
      {{ pr.text }}
    </div>

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

.score-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffeb3b;
  padding: 8px 22px;
  border-radius: 999px;
  box-shadow: 0 5px 0 #fbc02d, 0 8px 15px rgba(0, 0, 0, 0.15);
  font-size: 26px;
  font-weight: 900;
  color: #d81b60;
  border: 3px solid #ffffff;
}

.burst-badge {
  background: rgba(255, 255, 255, 0.95);
  border: 3px solid #ff4081;
  color: #d81b60;
  font-size: 17px;
  font-weight: 900;
  padding: 6px 16px;
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
  padding: 8px 20px;
  font-size: 18px;
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

/* 비누방울 타겟 컨테이너 */
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

/* 내부 원형 코어: 사각 하얀 배경을 완벽하게 원형으로 클리핑 */
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

/* 비누방울 투명 링 및 반사광 */
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

/* 팡! 터지는 효과 */
.bubble-item.pop {
  transform: translate(-50%, -50%) scale(1.45) !important;
  opacity: 0;
  transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.18s ease-out;
}

/* +1 점수 팝업 */
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

/* 칭찬 말풍선 팝업 */
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

/* 별가루 파티클 */
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

@media (max-width: 480px) {
  .game-header {
    padding: 0 16px;
  }
  .score-badge {
    padding: 6px 16px;
    font-size: 20px;
  }
  .burst-badge {
    font-size: 14px;
    padding: 4px 10px;
  }
  .cute-btn {
    padding: 6px 16px;
    font-size: 15px;
  }
  .praise-float {
    font-size: 22px;
  }
}
</style>