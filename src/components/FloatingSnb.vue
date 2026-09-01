<script setup>
import { ref } from 'vue';

const isOpen = ref(false);
const emit = defineEmits(['navigate']);

function selectMenu(target) {
  emit('navigate', target);
  isOpen.value = false;
}
</script>

<template>
  <nav class="snb-wrapper" aria-label="사이드 메뉴">
    <!-- 펼침 메뉴 리스트 -->
    <Transition name="snb-pop">
      <div v-if="isOpen" class="snb-menu">
        <!-- 1. 메인 홈 -->
        <button class="snb-item home-btn" @click="selectMenu('home')">
          <span class="menu-icon">🏠</span>
          <span class="menu-label">메인 놀이터</span>
        </button>

        <!-- 2. 퐁퐁 동물 피아노 -->
        <button class="snb-item" @click="selectMenu('animal-piano')">
          <span class="menu-icon">🎹</span>
          <span class="menu-label">퐁퐁 동물 피아노</span>
        </button>

        <!-- 3. 한글 & 숫자 그리기 -->
        <button class="snb-item" @click="selectMenu('trace-drawing')">
          <span class="menu-icon">✏️</span>
          <span class="menu-label">한글·숫자 그리기</span>
        </button>

        <!-- 4. 매직 컬러링 -->
        <button class="snb-item" @click="selectMenu('magic-drawing')">
          <span class="menu-icon">🎨</span>
          <span class="menu-label">매직 손가락 컬러링</span>
        </button>

        <!-- 5. 이모티콘 팡팡 -->
        <button class="snb-item" @click="selectMenu('emoji-pop')">
          <span class="menu-icon">🎈</span>
          <span class="menu-label">이모티콘 팡팡</span>
        </button>
      </div>
    </Transition>

    <!-- 플로팅 토글 버튼 (왼쪽 하단 고정) -->
    <button
      class="snb-float-btn"
      :class="{ active: isOpen }"
      aria-label="메뉴 열기/닫기"
      @click="isOpen = !isOpen"
    >
      <span v-if="isOpen" class="btn-symbol close-symbol">✕</span>
      <span v-else class="btn-symbol menu-symbol" style="top: 2px;">☰</span>
    </button>
  </nav>
</template>

<style scoped>
/* 화면 왼쪽 하단 고정 */
.snb-wrapper {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  user-select: none;
  -webkit-user-select: none;
}

/* 동그란 플로팅 토글 버튼 */
.snb-float-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ff4757;
  color: white;
  border: 4px solid #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s;
  touch-action: manipulation;
}

.snb-float-btn:active {
  transform: scale(0.92);
}

.snb-float-btn.active {
  background: #2f3542;
}

.btn-symbol {
  font-size: 32px;
  line-height: 1;
  font-weight: 900;
}

.close-symbol {
  font-size: 26px;
}

/* 펼쳐지는 팝업 메뉴 박스 */
.snb-menu {
  background: #ffffff;
  border: 3px solid #ff6b81;
  border-radius: 22px;
  padding: 10px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  min-width: 220px;
  transform-origin: bottom left;
}

/* 메뉴 항목 버튼 */
.snb-item {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 10px;
  background: #f1f2f6;
  border: 2px solid transparent;
  padding: 10px 14px;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.1s;
  text-align: left;
}

.snb-item:active {
  background: #ffeaa7;
  transform: scale(0.98);
}

.snb-item.home-btn {
  background: #74b9ff;
}

.snb-item.home-btn .menu-label {
  color: #ffffff;
}

/* 정렬을 위한 고정 너비 이모지 */
.menu-icon {
  font-size: 22px;
  line-height: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-label {
  font-size: 16px;
  font-weight: 800;
  color: #2f3542;
  white-space: nowrap;
}

/* 팝업 바운스 애니메이션 */
.snb-pop-enter-active,
.snb-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.snb-pop-enter-from,
.snb-pop-leave-to {
  opacity: 0;
  transform: scale(0.7) translateY(20px);
}
</style>