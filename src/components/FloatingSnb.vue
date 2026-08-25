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
        <button class="snb-item home-btn" @click="selectMenu('home')">
          <!-- 홈 아이콘 SVG -->
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>메인 놀이터</span>
        </button>

        <button class="snb-item" @click="selectMenu('magic-drawing')">
          <!-- 팔레트 아이콘 SVG -->
          <svg class="icon icon-orange" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.34 10.56 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-4.5 9c-.83 0-1.5-.67-1.5-1.5S6.67 9 7.5 9s1.5.67 1.5 1.5S8.33 12 7.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S9.67 5 10.5 5s1.5.67 1.5 1.5S11.33 8 10.5 8zm3 0c-.83 0-1.5-.67-1.5-1.5S12.67 5 13.5 5s1.5.67 1.5 1.5S14.33 8 13.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S15.67 9 16.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
          <span>매직 손가락 컬러링</span>
        </button>

        <button class="snb-item" @click="selectMenu('emoji-pop')">
          <!-- 풍선 아이콘 SVG -->
          <svg class="icon icon-pink" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>이모티콘 팡팡</span>
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
      <!-- 닫기(X) 아이콘 -->
      <svg v-if="isOpen" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <!-- 햄버거 메뉴 아이콘 -->
      <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  </nav>
</template>

<style scoped>
/* 1. 화면 왼쪽 하단 고정 */
.snb-wrapper {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 2. 동그란 플로팅 버튼 */
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
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s;
}

.snb-float-btn:active {
  transform: scale(0.92);
}

.snb-float-btn.active {
  background: #2f3542;
}

.btn-icon {
  width: 30px;
  height: 30px;
}

/* 3. 펼쳐지는 팝업 메뉴 */
.snb-menu {
  background: #ffffff;
  border: 3px solid #ff6b81;
  border-radius: 20px;
  padding: 10px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 210px;
  transform-origin: bottom left;
}

.snb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f1f2f6;
  border: 2px solid transparent;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #2f3542;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.snb-item:active {
  background: #ffeaa7;
  transform: scale(0.98);
}

.snb-item.home-btn {
  background: #74b9ff;
  color: #ffffff;
}

.icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.icon-orange { color: #e17055; }
.icon-pink { color: #ff4081; }

/* 팝업 등장 애니메이션 */
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