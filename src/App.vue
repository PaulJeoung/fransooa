<script setup>
import { ref, onMounted } from 'vue';
import LoadingScreen from './components/LoadingScreen.vue';
import MainHome from './components/MainHome.vue';
import FloatingSnb from './components/FloatingSnb.vue';
import MagicDrawing from './components/games/MagicDrawing.vue';
import EmojiPop from './components/games/EmojiPop.vue';

const isLoading = ref(true);
const currentScreen = ref('home');

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false; // 3초동안 inprogress 동작
  }, 3000);
});

function handleNavigate(target) {
  currentScreen.value = target;
}
</script>

<template>
  <main id="app">
    <LoadingScreen v-if="isLoading" /> <!-- inpregress 화면 -->

    <template v-else> <!-- 화면 라우팅 -->
      <MainHome v-if="currentScreen === 'home'" />
      <MagicDrawing v-else-if="currentScreen === 'magic-drawing'" />
      <EmojiPop v-else-if="currentScreen === 'emoji-pop'" />

      <FloatingSnb @navigate="handleNavigate" /> <!-- SNB -->
    </template>
  </main>
</template>