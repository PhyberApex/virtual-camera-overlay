<template>
  <div
    v-if="heartEnabled && heartRate"
    class="fixed top-8 right-8 flex justify-end z-50"
  >
    <div 
      class="bg-pink-600/85 rounded-2xl p-5 px-7 shadow-xl backdrop-blur-md border-2 border-white/20 text-center min-w-36"
      :class="getHeartRateZoneBackground()"
    >
      <!-- Pulsing heart icon -->
      <div class="relative flex justify-center items-center mb-3">
        <div 
          ref="heartIcon" 
          class="text-5xl relative z-10"
          :class="getHeartRateZoneClass()"
          style="filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));"
        >
          ❤️
        </div>
        <!-- Ripple effect -->
        <div 
          ref="ripple" 
          class="absolute w-10 h-10 border-4 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          :class="getHeartRateZoneRipple()"
        ></div>
      </div>
      
      <!-- Heart rate value -->
      <div class="mb-2">
        <span class="text-5xl font-extrabold text-white block leading-none text-shadow-custom">{{ heartRate }}</span>
        <span class="text-lg text-white/90 font-semibold text-shadow-sm">BPM</span>
      </div>
      
      <!-- Heart rate zone indicator -->
      <div class="mt-1">
        <span class="text-sm font-semibold text-white/80 uppercase tracking-wider text-shadow-sm">{{ getHeartRateZone() }}</span>
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

// [Inference] Tailwind classes for different heart rate zones
const getHeartRateZoneClass = (): string => {
  if (!heartRate.value) return 'text-blue-400';
  
  const bpm = heartRate.value;
  if (bpm < 60) return 'text-blue-400';
  if (bpm < 100) return 'text-green-400';
  if (bpm < 120) return 'text-yellow-400';
  if (bpm < 150) return 'text-orange-400';
  if (bpm < 180) return 'text-red-400';
  return 'text-red-600';
};

// [Inference] Background color classes for different zones
const getHeartRateZoneBackground = (): string => {
  if (!heartRate.value) return 'bg-blue-600/85 shadow-blue-600/30';
  
  const bpm = heartRate.value;
  if (bpm < 60) return 'bg-blue-600/85 shadow-blue-600/30';
  if (bpm < 100) return 'bg-green-600/85 shadow-green-600/30';
  if (bpm < 120) return 'bg-yellow-600/85 shadow-yellow-600/30';
  if (bpm < 150) return 'bg-orange-600/85 shadow-orange-600/30';
  if (bpm < 180) return 'bg-red-600/85 shadow-red-600/30';
  return 'bg-red-700/90 shadow-red-700/40 animate-pulse-glow';
};

// [Inference] Ripple border color classes
const getHeartRateZoneRipple = (): string => {
  if (!heartRate.value) return 'border-blue-400';
  
  const bpm = heartRate.value;
  if (bpm < 60) return 'border-blue-400';
  if (bpm < 100) return 'border-green-400';
  if (bpm < 120) return 'border-yellow-400';
  if (bpm < 150) return 'border-orange-400';
  if (bpm < 180) return 'border-red-400';
  return 'border-red-600';
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
  heartbeatAnimation.to(heartIcon.value, {
    scale: 1.3,
    duration: 0.1,
    ease: 'power2.out'
  }).to(heartIcon.value, {
    scale: 1,
    duration: 0.2,
    ease: 'power2.out'
  }).to(heartIcon.value, {
    scale: 1.15,
    duration: 0.08,
    ease: 'power2.out'
  }).to(heartIcon.value, {
    scale: 1,
    duration: 0.15,
    ease: 'power2.out'
  }).to(heartIcon.value, {
    scale: 1,
    duration: Math.max(0.1, beatInterval - 0.53), // Remaining time until next beat
    ease: 'none'
  });

  // Ripple effect animation
  rippleAnimation = gsap.timeline({ repeat: -1 });
  rippleAnimation.fromTo(ripple.value, {
    scale: 0,
    opacity: 0.8
  }, {
    scale: 2,
    opacity: 0,
    duration: beatInterval,
    ease: 'power2.out'
  });
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
watch(heartRate, async (newRate) => {
  if (newRate && heartEnabled.value) {
    await nextTick();
    startHeartbeatAnimation();
  } else {
    stopAnimations();
  }
});

// Watch for heartEnabled changes
watch(heartEnabled, async (enabled) => {
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
/* Custom text shadow utilities - since Tailwind's text-shadow is limited */
.text-shadow-custom {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
}

.text-shadow-sm {
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* Custom animation for maximum heart rate */
@keyframes pulse-glow {
  from {
    box-shadow: 0 6px 25px rgba(220, 38, 38, 0.4);
  }
  to {
    box-shadow: 0 8px 30px rgba(220, 38, 38, 0.6);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 1s ease-in-out infinite alternate;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {  
  .min-w-36 {
    @apply min-w-32;
  }
  
  .text-5xl {
    @apply text-4xl;
  }
  
  .text-5xl.font-extrabold {
    @apply text-4xl;
  }
}
</style>