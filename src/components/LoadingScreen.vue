<script setup>
// import { ref, onMounted, onUnmounted } from 'vue';

// const fullText = '놀이터로 가고 있습니다...';
// const displayText = ref('');
// let typingTimer = null;

// onMounted(() => {
//   let index = 0;
//   typingTimer = setInterval(() => {
//     if (index < fullText.length) {
//       displayText.value += fullText[index];
//       index++;
//     } else {
//       clearInterval(typingTimer);
//     }
//   }, 100);
// });

// onUnmounted(() => {
//   if (typingTimer) clearInterval(typingTimer);
// });
</script>

<template>
  <div class="loading-screen">
    <!-- 1. 중앙 원형 비디오 & 순환 그라데이션 링 -->
    <div class="video-circle-wrapper">
      <div class="gradient-ring"></div>
      <div class="video-container">
        <video
          src="/video/loading_video.mp4"
          autoplay
          loop
          muted
          playsinline
          class="loading-video"
        ></video>
      </div>
    </div>

    <!-- 2. "놀이터로 달려 가요" 애니메이션 텍스트 -->
    <div class="loading-textbox">
      <h2 class="animated-text">
        <span class="char" style="--i: 1">놀</span>
        <span class="char" style="--i: 2">이</span>
        <span class="char" style="--i: 3">터</span>
        <span class="char" style="--i: 4">로</span>
        <span class="char space" style="--i: 5">&nbsp;</span>
        <span class="char" style="--i: 6">달</span>
        <span class="char" style="--i: 7">려</span>
        <span class="char space" style="--i: 8">&nbsp;</span>
        <span class="char" style="--i: 9">가</span>
        <span class="char" style="--i: 10">는</span>
        <span class="char bounce-icon" style="--i: 11">중</span>
      </h2>
    </div>
  </div>
</template>

<style scoped>
/* 전체 화면 배경 */
.loading-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #fbcfe8 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden;
}

/* 원형 비디오 래퍼 */
.video-circle-wrapper {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 외곽 순환 그라데이션 링 (애니메이션) */
.gradient-ring {
  position: absolute;
  top: -10px;
  left: -10px;
  width: calc(100% + 20px);
  height: calc(100% + 20px);
  border-radius: 50%;
  background: conic-gradient(
    #ff4757,
    #ffa502,
    #2ed573,
    #1e90ff,
    #9b59b6,
    #ff4757
  );
  animation: rotateRing 3s linear infinite;
  filter: drop-shadow(0 0 15px rgba(255, 107, 129, 0.45));
}

@keyframes rotateRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 동그란 비디오 컨테이너 */
.video-container {
  position: relative;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  overflow: hidden;
  background: #ffffff;
  border: 4px solid #ffffff;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

/* 비디오 화면 맞춤 */
.loading-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 텍스트 컨테이너 */
.loading-textbox {
  margin-top: 36px;
  z-index: 2;
}

/* 글자별 바운스 애니메이션 */
.animated-text {
  font-size: 28px;
  font-weight: 900;
  color: #1e3799;
  letter-spacing: -0.5px;
  text-shadow: 2px 2px 0 #ffffff, 0 4px 10px rgba(30, 55, 153, 0.2);
  display: flex;
  align-items: center;
}

.char {
  display: inline-block;
  animation: bounceLetter 1.4s ease-in-out infinite;
  animation-delay: calc(0.08s * var(--i));
}

.bounce-icon {
  margin-left: 4px;
}

@keyframes bounceLetter {
  0%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-12px) scale(1.15);
    color: #ff4757;
  }
  60% {
    transform: translateY(2px);
  }
}
</style>