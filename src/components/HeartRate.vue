<template>
  <div v-if="heartEnabled && heartRate" class="heart-rate-overlay">
    <!-- Pulsing screen border -->
    <div ref="screenBorder" class="screen-border" :class="getHeartRateClass()"></div>

    <!-- Pulse waves emanating from top-left -->
    <div class="pulse-waves">
      <div
        v-for="wave in 3"
        :key="wave"
        ref="pulseWaves"
        class="pulse-wave"
        :class="getHeartRateClass()"
        :style="{ animationDelay: `${(wave - 1) * 0.2}s` }"
      ></div>
    </div>

    <!-- Small BPM display -->
    <div class="bpm-display" :class="getHeartRateClass()">
      <div class="bpm-value">{{ heartRate }}</div>
      <div class="bpm-label">BPM</div>
    </div>

    <!-- Subtle blood drop animation for high heart rates -->
    <div v-if="heartRate > 100" class="blood-drops">
      <div
        v-for="drop in getBloodDropCount()"
        :key="drop"
        class="blood-drop"
        :style="{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random()}s`,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';
import gsap from 'gsap';

const { heartEnabled, heartRate } = useHomeAssistant();

const screenBorder: Ref<HTMLDivElement | null> = ref(null);
const pulseWaves: Ref<HTMLDivElement[]> = ref([]);

let borderPulseAnimation: gsap.core.Timeline | null = null;

// Get CSS classes based on heart rate zones
const getHeartRateClass = (): string => {
  if (!heartRate.value) return 'zone-resting';

  const bpm = heartRate.value;
  if (bpm < 60) return 'zone-resting';
  if (bpm < 70) return 'zone-normal';
  if (bpm < 100) return 'zone-active';
  if (bpm < 120) return 'zone-exercise';
  if (bpm < 130) return 'zone-intense';
  return 'zone-maximum';
};

// Calculate blood drop count based on heart rate
const getBloodDropCount = (): number => {
  if (!heartRate.value) return 0;
  const bpm = heartRate.value;
  if (bpm < 120) return 0;
  if (bpm < 130) return 3;
  if (bpm < 140) return 5;
  return 8;
};

// Start pulsing border animation
const startBorderPulse = (): void => {
  if (!screenBorder.value || !heartRate.value) return;

  // Stop existing animation
  if (borderPulseAnimation) borderPulseAnimation.kill();

  // Calculate pulse interval based on heart rate
  const beatInterval = 60 / heartRate.value;

  // Create pulsing border animation
  borderPulseAnimation = gsap.timeline({ repeat: -1 });

  borderPulseAnimation
    .to(screenBorder.value, {
      opacity: 0.8,
      duration: 0.1,
      ease: 'power2.out',
    })
    .to(screenBorder.value, {
      opacity: 0.2,
      duration: 0.3,
      ease: 'power2.out',
    })
    .to(screenBorder.value, {
      opacity: 0.6,
      duration: 0.08,
      ease: 'power2.out',
    })
    .to(screenBorder.value, {
      opacity: 0.2,
      duration: Math.max(0.1, beatInterval - 0.48),
      ease: 'power2.out',
    });
};

const stopAnimations = (): void => {
  if (borderPulseAnimation) {
    borderPulseAnimation.kill();
    borderPulseAnimation = null;
  }
};

// Watch for heart rate changes
watch(heartRate, async newRate => {
  if (newRate && heartEnabled.value) {
    await nextTick();
    startBorderPulse();
  } else {
    stopAnimations();
  }
});

// Watch for heartEnabled changes
watch(heartEnabled, async enabled => {
  if (enabled && heartRate.value) {
    await nextTick();
    startBorderPulse();
  } else {
    stopAnimations();
  }
});

onMounted(() => {
  if (heartEnabled.value && heartRate.value) {
    startBorderPulse();
  }
});

onUnmounted(() => {
  stopAnimations();
});
</script>

<style scoped>
.heart-rate-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* Pulsing screen border */
.screen-border {
  position: absolute;
  inset: 0;
  border-width: 4px;
  border-style: solid;
  opacity: 0.3;
  transition: border-color 0.3s ease;
}

/* BPM Display - top left corner */
.bpm-display {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 12px 16px;
  border: 2px solid;
  border-color: inherit;
  text-align: center;
  min-width: 80px;
  transition: all 0.3s ease;
}

.bpm-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
  line-height: 1;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.bpm-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  margin-top: 2px;
}

.bpm-zone {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* Pulse waves */
.pulse-waves {
  position: absolute;
  top: 20px;
  left: 20px;
}

.pulse-wave {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid;
  border-radius: 50%;
  opacity: 0;
  animation: pulseWave 2s ease-out infinite;
}

@keyframes pulseWave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

/* Blood drops for high heart rate */
.blood-drops {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  overflow: hidden;
}

.blood-drop {
  position: absolute;
  width: 8px;
  height: 12px;
  background: #dc2626;
  border-radius: 0 0 50% 50%;
  opacity: 0.6;
  animation: bloodDrop 3s linear infinite;
  transform: rotate(10deg);
}

.blood-drop:before {
  content: '';
  position: absolute;
  top: -4px;
  left: 2px;
  width: 4px;
  height: 4px;
  background: #dc2626;
  border-radius: 50%;
}

@keyframes bloodDrop {
  0% {
    top: -20px;
    opacity: 0;
  }
  5% {
    opacity: 0.6;
  }
  100% {
    top: 100vh;
    opacity: 0;
  }
}

/* Heart rate zone color schemes */
.zone-resting {
  border-color: #3b82f6;
  color: #3b82f6;
}

.zone-normal {
  border-color: #10b981;
  color: #10b981;
}

.zone-active {
  border-color: #f59e0b;
  color: #f59e0b;
}

.zone-exercise {
  border-color: #f97316;
  color: #f97316;
}

.zone-intense {
  border-color: #dc2626;
  color: #dc2626;
}

.zone-maximum {
  border-color: #991b1b;
  color: #991b1b;
  animation: dangerPulse 1s ease-in-out infinite alternate;
}

@keyframes dangerPulse {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.3);
  }
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .screen-border {
    border-width: 2px;
  }

  .bpm-display {
    top: 15px;
    left: 15px;
    padding: 8px 12px;
    min-width: 70px;
  }

  .bpm-value {
    font-size: 1.5rem;
  }

  .bpm-label {
    font-size: 0.6rem;
  }

  .bmp-zone {
    font-size: 0.5rem;
  }

  .pulse-waves {
    top: 15px;
    left: 15px;
  }

  .pulse-wave {
    width: 16px;
    height: 16px;
  }

  .blood-drop {
    width: 6px;
    height: 10px;
  }
}

/* Subtle screen tint for very high heart rates */
.heart-rate-overlay.zone-maximum::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 70%, rgba(153, 27, 27, 0.1) 100%);
  animation: screenTint 2s ease-in-out infinite alternate;
}

@keyframes screenTint {
  from {
    opacity: 0.3;
  }
  to {
    opacity: 0.6;
  }
}
</style>
