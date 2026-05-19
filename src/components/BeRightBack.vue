<template>
  <div v-if="brbEnabled" class="brb-overlay">
    <!-- GIMMICKY: Floating emoji particles background -->
    <div class="particles">
      <img
        v-for="i in 15"
        :key="i"
        :src="getRandomEmoji(i)"
        alt=""
        class="particle-emoji"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${8 + Math.random() * 4}s`,
          width: `${40 + Math.random() * 30}px`,
        }"
      />
    </div>

    <div class="brb-content">
      <!-- Message in vital green -->
      <h1 ref="title" class="brb-title">Be Right Back</h1>

      <p ref="subtitle" class="brb-subtitle">I'll be back in a moment!</p>

      <!-- Loading dots in vital green -->
      <div class="brb-dots">
        <div
          v-for="i in 3"
          :key="i"
          class="brb-dot"
          :style="{ animationDelay: `${(i - 1) * 0.3}s` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';

const { brbEnabled } = useHomeAssistant();
const title: Ref<HTMLHeadingElement | null> = ref(null);
const subtitle: Ref<HTMLParagraphElement | null> = ref(null);

// Emoji images for particles
const emojiImages = [
  '/rain/janiswow.png',
  '/rain/janisreally.png',
  '/rain/janisapproved.png',
  '/rain/janiswhy.png',
  '/rain/mortyxmas.png',
];

// Get random emoji for each particle (deterministic based on index)
const getRandomEmoji = (index: number): string => {
  return emojiImages[index % emojiImages.length];
};
</script>

<style scoped>
/* REFINED: matches main overlay aesthetic with vital green + FULLY OPAQUE */
.brb-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000; /* FULLY OPAQUE - hides entire webcam */
  z-index: 50;
  overflow: hidden;
}

/* GIMMICKY: Floating emoji particles */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle-emoji {
  position: absolute;
  height: auto;
  opacity: 0;
  animation: floatEmoji 10s infinite ease-in-out;
  filter: drop-shadow(0 0 8px rgba(132, 204, 22, 0.3));
}

@media (prefers-reduced-motion: reduce) {
  .particle-emoji {
    animation: none;
    display: none;
  }
}

@keyframes floatEmoji {
  0% {
    opacity: 0;
    transform: translateY(0) translateX(0) scale(0.5) rotate(0deg);
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    transform: translateY(-120vh) translateX(calc((var(--random, 0.5) - 0.5) * 200px)) scale(1)
      rotate(360deg);
  }
}

.brb-content {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 0 1rem;
}

/* REFINED: vital green instead of indigo */
.brb-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  color: var(--color-vital-green); /* vital green accent */
  margin-bottom: 1rem;
  letter-spacing: 0.05em;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
}

.brb-subtitle {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  color: var(--color-text-secondary);
  max-width: 28rem;
  margin: 0 auto;
  letter-spacing: 0.02em;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
}

/* REFINED: vital green dots instead of white */
.brb-dots {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.brb-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: var(--color-vital-green);
  animation: pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .brb-dot {
    animation: none;
    opacity: 0.6;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
