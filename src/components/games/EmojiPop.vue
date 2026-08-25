<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 3~4세 아이들이 좋아하는 동물/간식 이모티콘 리스트
const EMOJI_LIST = ['🐻', '🐰', '🦁', '🐥', '🦄', '🍓', '🎈', '⭐', '🚗', '🍰', '🐶', '🐱'];

const score = ref(0);
const isPlaying = ref(false);
const targets = ref([]);
const sparkles = ref([]);
const scorePops = ref([]);

let spawnTimer = null;
let audioCtx = null;
let comboCount = 0;
let lastPopTime = 0;

// 1. 유아용 팝 사운드 (연속으로 누르면 음이 점점 올라감)
function playPopSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = Date.now();
    if (now - lastPopTime < 400) {
      comboCount = Math.min(comboCount + 1, 6);
    } else {
      comboCount = 0;
    }
    lastPopTime = now;

    const baseFreq = 523.25; // C5
    const pitchMultiplier = 1 + comboCount * 0.12;
    const startFreq = baseFreq * pitchMultiplier;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// 2. 10점 단위 축하 팡파레 사운드
function playMilestoneSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }, idx * 80);
    });
  } catch (e) {}
}

// 3. 별가루 파티클 & +1 텍스트 팝업 생성
function createSparkles(x, y) {
  const sparkleIcons = ['✨', '⭐', '💖', '🎉'];
  const newSparkles = Array.from({ length: 6 }).map(() => ({
    id: Math.random(),
    icon: sparkleIcons[Math.floor(Math.random() * sparkleIcons.length)],
    x,
    y,
    tx: `${(Math.random() - 0.5) * 130}px`,
    ty: `${(Math.random() - 0.5) * 130}px`
  }));

  sparkles.value.push(...newSparkles);
  setTimeout(() => {
    sparkles.value = sparkles.value.filter(s => !newSparkles.includes(s));
  }, 600);

  // 점수 텍스트 팝업 (+1)
  const scorePop = {
    id: Math.random(),
    x,
    y: y - 20
  };
  scorePops.value.push(scorePop);
  setTimeout(() => {
    scorePops.value = scorePops.value.filter(sp => sp.id !== scorePop.id);
  }, 700);
}

// 4. 이모티콘 생성 및 둥둥 떠다니는 애니메이션
function spawnTarget() {
  if (!isPlaying.value) return;

  const id = Date.now() + Math.random();
  const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
  
  // 화면 안전 영역 (가로 15%~85%, 세로 20%~75%)
  const minX = 15, maxX = 85;
  const minY = 20, maxY = 75;
  const initX = Math.random() * (maxX - minX) + minX;
  const initY = Math.random() * (maxY - minY) + minY;

  const targetObj = {
    id,
    emoji,
    x: initX,
    y: initY,
    isPopped: false,
    moveInterval: null
  };

  // 1.2초마다 살짝씩 위치를 이동하며 둥둥 떠다님
  targetObj.moveInterval = setInterval(() => {
    if (targetObj.isPopped) {
      clearInterval(targetObj.moveInterval);
      return;
    }
    const nextX = Math.max(minX, Math.min(maxX, targetObj.x + (Math.random() - 0.5) * 12));
    const nextY = Math.max(minY, Math.min(maxY, targetObj.y + (Math.random() - 0.5) * 12));
    targetObj.x = nextX;
    targetObj.y = nextY;
  }, 1200);

  targets.value.push(targetObj);

  // 4.5초 동안 누르지 않으면 부드럽게 소멸
  setTimeout(() => {
    const current = targets.value.find(t => t.id === id);
    if (current && !current.isPopped) {
      clearInterval(current.moveInterval);
      targets.value = targets.value.filter(t => t.id !== id);
    }
  }, 4500);
}

// 5. 이모티콘 터치/클릭 처리
function handlePop(target, e) {
  if (target.isPopped) return;
  target.isPopped = true;
  clearInterval(target.moveInterval);

  const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || (window.innerWidth * (target.x / 100));
  const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || (window.innerHeight * (target.y / 100));

  playPopSound();
  createSparkles(clientX, clientY);

  score.value += 1;
  if (score.value % 10 === 0) {
    playMilestoneSound();
  }

  // 0.2초 후 돔에서 제거 (터지는 애니메이션 시간 확보)
  setTimeout(() => {
    targets.value = targets.value.filter(t => t.id !== target.id);
  }, 200);
}

// 6. 게임 시작 / 재시작
function startGame() {
  score.value = 0;
  isPlaying.value = true;
  targets.value.forEach(t => clearInterval(t.moveInterval));
  targets.value = [];

  if (spawnTimer) clearInterval(spawnTimer);
  spawnTarget();
  spawnTimer = setInterval(spawnTarget, 950);
}

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer);
  targets.value.forEach(t => clearInterval(t.moveInterval));
});
</script>

<template>
  <div class="game-view emoji-bg">
    <!-- 상단 점수 헤더 바 -->
    <header class="game-header">
      <div class="score-badge">
        <span class="star-icon">⭐</span>
        <span>{{ score }}</span>
      </div>
      <button class="cute-btn" @click="startGame">다시하기</button>
    </header>

    <!-- 배경 둥실 구름 데코레이션 -->
    <div class="cloud cloud-1">☁️</div>
    <div class="cloud cloud-2">☁️</div>
    <div class="cloud cloud-3">☁️</div>

    <!-- 게임 영역 -->
    <main class="game-area">
      <!-- 둥둥 떠다니는 타겟 이모티콘들 -->
      <div
        v-for="target in targets"
        :key="target.id"
        class="target-emoji"
        :class="{ pop: target.isPopped }"
        :style="{
          left: target.x + '%',
          top: target.y + '%'
        }"
        @pointerdown="handlePop(target, $event)"
      >
        {{ target.emoji }}
      </div>
    </main>

    <!-- +1 점수 팝업 텍스트 -->
    <div
      v-for="sp in scorePops"
      :key="sp.id"
      class="score-float"
      :style="{ left: sp.x + 'px', top: sp.y + 'px' }"
    >
      +1
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
/* 배경 화면 */
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

/* 상단 정보 바 */
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

/* 배경 구름 애니메이션 */
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

/* 게임 플레이 영역 */
.game-area {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 날아다니는 이모티콘 버블 */
.target-emoji {
  position: absolute;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: radial-gradient(circle, #ffffff 45%, #fff9c4 100%);
  border: 4px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: left 1.2s ease-in-out, top 1.2s ease-in-out, transform 0.15s ease-out;
  animation: bounceBubble 1.8s infinite ease-in-out;
  touch-action: none;
}

@keyframes bounceBubble {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

/* 터질 때 팡! 커지는 이펙트 */
.target-emoji.pop {
  transform: translate(-50%, -50%) scale(1.45) !important;
  opacity: 0;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out;
}

/* +1 점수 둥실 팝업 */
.score-float {
  position: fixed;
  font-size: 26px;
  font-weight: 900;
  color: #ff3838;
  text-shadow: 2px 2px 0 #ffffff;
  pointer-events: none;
  z-index: 999;
  animation: floatUp 0.7s ease-out forwards;
}

@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  30% { transform: translate(-50%, -15px) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -40px) scale(1); opacity: 0; }
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
  .cute-btn {
    padding: 6px 16px;
    font-size: 15px;
  }
  .target-emoji {
    width: 80px;
    height: 80px;
    font-size: 42px;
  }
}
</style>