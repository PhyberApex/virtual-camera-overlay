<template>
  <div
    v-if="brbEnabled"
    class="fixed inset-0 flex items-center justify-center bg-indigo-900 bg-opacity-95 z-50 overflow-hidden"
  >
    <!-- Raining images container -->
    <div ref="rainContainer" class="absolute inset-0 pointer-events-none">
      <!-- Images will be created dynamically in onMounted -->
    </div>

    <div class="text-center px-4 relative z-10">
      <!-- Message -->
      <h1 ref="title" class="text-white text-4xl md:text-6xl font-bold mb-4 tracking-wider">
        Be Right Back
      </h1>

      <p ref="subtitle" class="text-indigo-200 text-xl md:text-2xl max-w-md mx-auto">
        I'll be back in a moment!
      </p>

      <!-- Loading dots -->
      <div class="mt-8 flex justify-center space-x-2">
        <div
          v-for="i in 3"
          :key="i"
          class="w-3 h-3 rounded-full bg-white animate-pulse"
          :style="{ animationDelay: `${(i - 1) * 0.3}s` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';
import gsap from 'gsap';

const props = defineProps({
  imageUrls: {
    type: Array,
    required: true,
  },
  imageCount: {
    type: Number,
    default: 25,
  },
});

const { brbEnabled } = useHomeAssistant();
const rainContainer = ref(null);
const title = ref(null);
const subtitle = ref(null);

let animations = [];

// Simple rain animation setup function
const setupRainAnimation = () => {
  if (!rainContainer.value) return;

  // Clear any existing animations
  animations.forEach(anim => anim.kill());
  animations = [];

  // Clear previous images
  rainContainer.value.innerHTML = '';

  // Helper function to get a random image URL
  const getRandomImageUrl = () => {
    if (!props.imageUrls || props.imageUrls.length === 0) {
      return ''; // Return empty if no images provided
    }
    const randomIndex = Math.floor(Math.random() * props.imageUrls.length);
    return props.imageUrls[randomIndex];
  };

  // Create and animate falling images
  for (let i = 0; i < props.imageCount; i++) {
    // Create image element
    const img = document.createElement('img');
    img.src = getRandomImageUrl();
    img.alt = 'falling image';
    img.className = 'absolute';
    img.style.width = `${32 + Math.random() * 16}px`; // Random sizes between 32-48px
    img.style.height = 'auto';
    img.style.opacity = '0';
    img.style.left = `${Math.random() * 100}%`;
    img.style.top = '-80px';
    rainContainer.value.appendChild(img);

    // Calculate random parameters for this image
    const duration = 3 + Math.random() * 2; // 3-5 seconds fall time
    const delay = Math.random() * 20; // Stagger start times over 20 seconds
    const xMovement = Math.random() * 100 - 50; // Random drift left/right as it falls

    // Create a timeline for this image
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: Math.random() * 3 + 1, // 1-4 seconds between falls
      onRepeat: function () {
        // Change image when the timeline repeats
        gsap.set(img, {
          opacity: 0,
          y: -100,
          rotation: Math.random() * 20 - 10,
          attr: { src: getRandomImageUrl() }, // Use attr to update src property
        });
      },
    });

    // Animate the image falling
    tl.fromTo(
      img,
      {
        y: -100,
        x: 0,
        opacity: 0,
        rotation: Math.random() * 20 - 10,
      },
      {
        y: window.innerHeight + 100, // Past bottom of screen
        x: xMovement,
        opacity: 0.8,
        rotation: Math.random() * 20 - 10,
        duration: duration,
        ease: 'none',
        delay: delay,
      }
    );

    animations.push(tl);
  }
};

// Watch for changes in brbEnabled
watch(brbEnabled, newVal => {
  if (newVal) {
    // Small delay to ensure DOM is ready
    setTimeout(setupRainAnimation, 100);
  } else {
    // Clean up animations when disabled
    animations.forEach(anim => anim.kill());
    animations = [];
  }
});

onMounted(() => {
  if (brbEnabled.value) {
    setupRainAnimation();
  }

  // Handle window resize
  window.addEventListener('resize', setupRainAnimation);
});

onUnmounted(() => {
  // Clean up
  animations.forEach(anim => anim.kill());
  window.removeEventListener('resize', setupRainAnimation);
});
</script>
