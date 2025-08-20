<template>
  <div v-if="heartEnabled" class="fixed top-8 left-8 flex justify-start z-50">
    <div
      class="rounded-2xl p-5 px-7 backdrop-blur-md border-2 border-white/20 text-center min-w-[140px] shadow-xl"
    >
      <!-- Pulsing heart icon -->
      <div class="relative flex justify-center items-center mb-3">
        <div
          ref="heartIcon"
          class="text-5xl z-10 relative drop-shadow-lg"
          :class="getHeartRateZoneClass()"
        >
          ❤️
        </div>
        <!-- Ripple effect -->
        <div
          ref="ripple"
          class="absolute w-10 h-10 border-4 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        ></div>
      </div>

      <!-- Heart rate value -->
      <div class="mb-2">
        <span class="text-5xl font-extrabold text-white drop-shadow-md block leading-none">{{
          heartRate
        }}</span>
        <span class="text-lg text-white/90 font-semibold drop-shadow-sm">BPM</span>
      </div>

      <!-- Heart rate zone indicator -->
      <div class="mt-1">
        <span class="text-sm font-semibold text-white/80 uppercase tracking-wider drop-shadow-sm">{{
          getHeartRateZone()
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';
import gsap from 'gsap';

const { heartEnabled, heartRate } = useHomeAssistant();

const heartIcon: Ref<HTMLDivElement | null> = ref(null);
const ripple: Ref<HTMLDivElement | null> = ref(null);

let heartbeatAnimation: gsap.core.Timeline | null = null;
let rippleAnimation: gsap.core.Timeline | null = null;

// [Inference] Heart rate zones based on common fitness guidelines
const getHeartRateZone = (): string => {
  if (!heartRate.value) return 'Resting';

  const bpm = heartRate.value;
  if (bpm < 60) return 'Resting';
  if (bpm < 100) return 'Normal';
  if (bpm < 120) return 'Elevated';
  if (bpm < 150) return 'Exercise';
  if (bpm < 180) return 'High';
  return 'Maximum';
};

// [Inference] CSS classes for different heart rate zones
const getHeartRateZoneClass = (): string => {
  if (!heartRate.value) return 'zone-resting';

  const bpm = heartRate.value;
  if (bpm < 60) return 'zone-resting';
  if (bpm < 100) return 'zone-normal';
  if (bpm < 120) return 'zone-elevated';
  if (bpm < 150) return 'zone-exercise';
  if (bpm < 180) return 'zone-high';
  return 'zone-maximum';
};

const startHeartbeatAnimation = (): void => {
  if (!heartIcon.value || !ripple.value || !heartRate.value) return;

  // Stop existing animations
  if (heartbeatAnimation) heartbeatAnimation.kill();
  if (rippleAnimation) rippleAnimation.kill();

  // Calculate interval based on heart rate (60 seconds / BPM = seconds per beat)
  const beatInterval = 60 / heartRate.value;

  // Heart icon pulse animation
  heartbeatAnimation = gsap.timeline({ repeat: -1 });
  heartbeatAnimation
    .to(heartIcon.value, {
      scale: 1.3,
      duration: 0.1,
      ease: 'power2.out',
    })
    .to(heartIcon.value, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    })
    .to(heartIcon.value, {
      scale: 1.15,
      duration: 0.08,
      ease: 'power2.out',
    })
    .to(heartIcon.value, {
      scale: 1,
      duration: 0.15,
      ease: 'power2.out',
    })
    .to(heartIcon.value, {
      scale: 1,
      duration: Math.max(0.1, beatInterval - 0.53), // Remaining time until next beat
      ease: 'none',
    });

  // Ripple effect animation
  rippleAnimation = gsap.timeline({ repeat: -1 });
  rippleAnimation.fromTo(
    ripple.value,
    {
      scale: 0,
      opacity: 0.8,
    },
    {
      scale: 2,
      opacity: 0,
      duration: beatInterval,
      ease: 'power2.out',
    }
  );
};

const stopAnimations = (): void => {
  if (heartbeatAnimation) {
    heartbeatAnimation.kill();
    heartbeatAnimation = null;
  }
  if (rippleAnimation) {
    rippleAnimation.kill();
    rippleAnimation = null;
  }
};

// Watch for heart rate changes to restart animation with new timing
watch(heartRate, async newRate => {
  if (newRate && heartEnabled.value) {
    await nextTick();
    startHeartbeatAnimation();
  } else {
    stopAnimations();
  }
});

// Watch for heartEnabled changes
watch(heartEnabled, async enabled => {
  if (enabled && heartRate.value) {
    await nextTick();
    startHeartbeatAnimation();
  } else {
    stopAnimations();
  }
});

onMounted(() => {
  if (heartEnabled.value && heartRate.value) {
    startHeartbeatAnimation();
  }
});

onUnmounted(() => {
  stopAnimations();
});
</script>

<style scoped>
/* Responsive adjustments using Tailwind classes in template, minimal custom CSS */
@media (max-width: 768px) {
  .min-w-\[140px\] {
    min-width: 120px;
  }
}
</style>
