<template>
  <div v-if="heartEnabled && heartRate && !connectionLost" class="heart-rate-overlay">
    <!-- Pulsing screen border -->
    <div ref="screenBorder" class="screen-border" :class="getHeartRateClass()"></div>

    <!-- Pulse waves, anchored to the configured corner -->
    <div class="pulse-waves" :style="cornerStyle">
      <div
        v-for="wave in 3"
        :key="wave"
        ref="pulseWaves"
        class="pulse-wave"
        :class="getHeartRateClass()"
        :style="{ animationDelay: `${(wave - 1) * 0.2}s` }"
      ></div>
    </div>

    <!-- Small BPM display with zone indicator, anchored to the same corner -->
    <div class="bpm-display" :class="getHeartRateClass()" :style="cornerStyle">
      <div class="bpm-value">{{ heartRate }}</div>
      <div class="bpm-label">BPM</div>
      <div class="bpm-zone">{{ getHeartRateZoneName() }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';
import { useOverlayConfig } from '../composables/useOverlayConfig';
import { getHeartRateZone, type HeartRateZone } from '../utils/heartRateZone';
import { computeCornerStyle } from '../utils/widgetLayout';
import gsap from 'gsap';

const { heartEnabled, heartRate, connectionLost } = useHomeAssistant();
const { maxHeartRate, heartRateLayout } = useOverlayConfig();

const screenBorder: Ref<HTMLDivElement | null> = ref(null);
const pulseWaves: Ref<HTMLDivElement[]> = ref([]);

// Matches the existing .bpm-display/.pulse-waves mobile breakpoint below.
const MOBILE_BREAKPOINT_WIDTH = 768;
const MOBILE_OFFSET_REDUCTION = 5;

const isMobile: Ref<boolean> = ref(window.innerWidth <= MOBILE_BREAKPOINT_WIDTH);
const updateIsMobile = (): void => {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT_WIDTH;
};

const effectiveOffset = computed(() => {
  const { offset } = heartRateLayout.value;
  if (!isMobile.value) return offset;
  return {
    x: Math.max(0, offset.x - MOBILE_OFFSET_REDUCTION),
    y: Math.max(0, offset.y - MOBILE_OFFSET_REDUCTION),
  };
});

const cornerStyle = computed(() =>
  computeCornerStyle(heartRateLayout.value.anchor, effectiveOffset.value)
);

let borderPulseAnimation: gsap.core.Timeline | null = null;

const getHeartRateZoneForDisplay = (): HeartRateZone => {
  if (!heartRate.value) return 'resting';
  return getHeartRateZone(heartRate.value, maxHeartRate.value);
};

// Get CSS classes based on heart rate zones
const getHeartRateClass = (): string => `zone-${getHeartRateZoneForDisplay()}`;

// Get zone name for display (for viewers to understand colors)
const getHeartRateZoneName = (): string => getHeartRateZoneForDisplay();

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
  if (newRate && heartEnabled.value && !connectionLost.value) {
    await nextTick();
    startBorderPulse();
  } else {
    stopAnimations();
  }
});

// Watch for heartEnabled changes
watch(heartEnabled, async enabled => {
  if (enabled && heartRate.value && !connectionLost.value) {
    await nextTick();
    startBorderPulse();
  } else {
    stopAnimations();
  }
});

// Watch for connection-loss changes
watch(connectionLost, async lost => {
  if (!lost && heartEnabled.value && heartRate.value) {
    await nextTick();
    startBorderPulse();
  } else {
    stopAnimations();
  }
});

onMounted(() => {
  if (heartEnabled.value && heartRate.value && !connectionLost.value) {
    startBorderPulse();
  }
  window.addEventListener('resize', updateIsMobile);
});

onUnmounted(() => {
  stopAnimations();
  window.removeEventListener('resize', updateIsMobile);
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

/* REFINED: BPM Display - positioned via cornerStyle, anchored to the configured corner */
.bpm-display {
  position: absolute;
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

/* Pulse waves - positioned via cornerStyle, anchored to the configured corner */
.pulse-waves {
  position: absolute;
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
