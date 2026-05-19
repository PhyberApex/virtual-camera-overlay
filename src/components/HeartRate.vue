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

    <!-- Small BPM display with zone indicator -->
    <div class="bpm-display" :class="getHeartRateClass()">
      <div class="bpm-value">{{ heartRate }}</div>
      <div class="bpm-label">BPM</div>
      <div class="bpm-zone">{{ getHeartRateZoneName() }}</div>
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

// REFINED: Get zone name for display (for viewers to understand colors)
const getHeartRateZoneName = (): string => {
  if (!heartRate.value) return 'resting';

  const bpm = heartRate.value;
  if (bpm < 60) return 'resting';
  if (bpm < 70) return 'normal';
  if (bpm < 100) return 'active';
  if (bpm < 120) return 'exercise';
  if (bpm < 130) return 'intense';
  return 'maximum';
};

// Start pulsing border animation
const startBorderPulse = (): void => {
  if (!screenBorder.value || !heartRate.value) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

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

/* REFINED: BPM Display - top left corner with zone text */
.bpm-display {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-widget); /* unified radius */
  padding: 12px 16px;
  border: 2px solid;
  border-color: inherit;
  text-align: center;
  min-width: 90px; /* slightly wider for zone text */
  transition: all 0.3s ease;
}

.bpm-value {
  font-size: 1.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums; /* better alignment */
  color: var(--color-text-primary);
  line-height: 1;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.bpm-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  letter-spacing: 0.05em; /* refined spacing */
  margin-top: 2px;
}

/* REFINED: zone name for viewers */
.bpm-zone {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-variant: small-caps; /* more sophisticated */
  letter-spacing: 0.08em; /* refined spacing */
  margin-top: 4px;
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
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .pulse-wave {
    animation: none;
    display: none;
  }
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

/* REFINED: removed blood drops - border pulsing is sufficient */

/* Heart rate zone color schemes */
.zone-resting {
  border-color: var(--color-zone-resting);
  color: var(--color-zone-resting);
  border-width: 2px;
}

.zone-normal {
  border-color: var(--color-zone-normal);
  color: var(--color-zone-normal);
  border-width: 2px;
}

.zone-active {
  border-color: var(--color-zone-active);
  color: var(--color-zone-active);
  border-width: 3px;
}

.zone-exercise {
  border-color: var(--color-zone-exercise);
  color: var(--color-zone-exercise);
  border-width: 3px;
}

.zone-intense {
  border-color: var(--color-zone-intense);
  color: var(--color-zone-intense);
  border-width: 4px;
}

.zone-maximum {
  border-color: var(--color-zone-maximum);
  color: var(--color-zone-maximum);
  border-width: 4px;
  animation: dangerPulse 1s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .zone-maximum {
    animation: none;
  }
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
    min-width: 80px;
  }

  .bpm-value {
    font-size: 1.5rem;
  }

  .bpm-label {
    font-size: 0.6rem;
  }

  .bpm-zone {
    font-size: 0.55rem;
  }

  .pulse-waves {
    top: 15px;
    left: 15px;
  }

  .pulse-wave {
    width: 16px;
    height: 16px;
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
