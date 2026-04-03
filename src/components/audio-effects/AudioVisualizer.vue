<template>
  <div class="audio-visualizer">
    <canvas ref="canvasRef" class="visualizer-canvas"></canvas>
    <div v-if="!audioContext" class="audio-permission-overlay">
      <p>Audio permission required for visualizer</p>
      <button @click="requestAudioPermission">Enable Audio</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const source = ref<MediaStreamAudioSourceNode | null>(null);
const animationFrameId = ref<number | null>(null);
const audioPermissionGranted = ref(false);

// Audio visualization parameters
const particleCount = 200;
const particles = ref<any[]>([]);

// Initialize audio context and setup analyser
const initAudio = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser.value = audioContext.value.createAnalyser();
    source.value = audioContext.value.createMediaStreamSource(stream);
    
    source.value.connect(analyser.value);
    analyser.value.fftSize = 256;
    
    // Initialize particles
    initParticles();
    
    // Start visualization
    animate();
    
    audioPermissionGranted.value = true;
  } catch (err) {
    console.error('Error accessing microphone:', err);
  }
};

// Initialize particles for the visualizer
const initParticles = () => {
  particles.value = [];
  const canvas = canvasRef.value;
  if (!canvas) return;

  for (let i = 0; i < particleCount; i++) {
    particles.value.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 2,
      speedY: (Math.random() - 0.5) * 2,
      color: `hsl(${Math.random() * 360}, 100%, 70%)`,
      frequency: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    });
  }
};

// Main animation loop
const animate = () => {
  if (!canvasRef.value || !analyser.value) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size to match display size
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Clear canvas with a semi-transparent overlay for trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bufferLength = analyser.value.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.value.getByteFrequencyData(dataArray);

  // Get average volume for intensity control
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  const average = sum / bufferLength;

  // Update and draw particles
  updateParticles(average, canvas.width, canvas.height);

  animationFrameId.value = requestAnimationFrame(animate);
};

// Update particle positions and properties based on audio data
const updateParticles = (volume: number, width: number, height: number) => {
  const canvas = canvasRef.value;
  if (!canvas || !analyser.value || !ctx) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get frequency data for color shifting
  const bufferLength = analyser.value.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.value.getByteFrequencyData(dataArray);

  // Calculate bass (low frequencies) for pulsing effects
  let bassSum = 0;
  const bassBins = Math.min(10, bufferLength);
  for (let i = 0; i < bassBins; i++) {
    bassSum += dataArray[i];
  }
  const bassLevel = bassSum / bassBins;

  // Update each particle
  particles.value.forEach((particle, index) => {
    // Apply audio-reactive movement
    const frequencyIndex = Math.floor((index / particleCount) * bufferLength);
    if (frequencyIndex < bufferLength) {
      const frequencyValue = dataArray[frequencyIndex] / 255;
      
      // Move particles based on frequency data
      particle.speedX += (Math.random() - 0.5) * frequencyValue * 0.5;
      particle.speedY += (Math.random() - 0.5) * frequencyValue * 0.5;
      
      // Apply some damping to prevent wild movements
      particle.speedX *= 0.95;
      particle.speedY *= 0.95;
    }
    
    // Update position with velocity
    particle.x += particle.speedX * (volume / 128);
    particle.y += particle.speedY * (volume / 128);
    
    // Apply pulsing effect from bass
    const pulse = Math.sin(Date.now() * 0.005 + particle.phase) * 0.5 + 0.5;
    const baseSize = particle.size;
    const pulseSize = baseSize * (1 + pulse * bassLevel / 255 * 2);
    
    // Keep particles within bounds
    if (particle.x < 0 || particle.x > width) particle.speedX *= -1;
    if (particle.y < 0 || particle.y > height) particle.speedY *= -1;
    
    particle.x = Math.max(0, Math.min(width, particle.x));
    particle.y = Math.max(0, Math.min(height, particle.y));
    
    // Draw particle with color based on frequency
    const hue = (frequencyIndex / bufferLength * 360 + Date.now() * 0.01) % 360;
    ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.5 + volume / 255 * 0.5})`;
    
    // Draw particle as circle
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
  });
};

// Request audio permission from user
const requestAudioPermission = async () => {
  await initAudio();
};

// Cleanup on unmount
onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
  }
  
  if (source.value) {
    source.value.disconnect();
  }
  
  if (audioContext.value) {
    audioContext.value.close();
  }
});

// Initialize audio when component is mounted
onMounted(() => {
  // For development, we'll initialize immediately to avoid permission issues in dev mode
  // In production, this would require user interaction
  if (import.meta.env.DEV) {
    initAudio();
  }
});

// Watch for audio permission changes
watch(audioPermissionGranted, (granted) => {
  if (granted && canvasRef.value) {
    animate();
  }
});
</script>

<style scoped>
.audio-visualizer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
  overflow: hidden;
}

.visualizer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.audio-permission-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.audio-permission-overlay button {
  margin-top: 10px;
  padding: 8px 16px;
  background: #4a90e2;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}
</style>