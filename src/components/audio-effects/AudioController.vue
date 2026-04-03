<template>
  <div class="audio-controller">
    <div class="preset-controls">
      <h3>Audio Effects Presets</h3>
      <div class="preset-buttons">
        <button 
          v-for="(preset, name) in presets" 
          :key="name"
          @click="changePreset(name)"
          :class="{ active: currentPreset === name }"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <div class="volume-control">
      <h3>Volume Control</h3>
      <input 
        type="range" 
        min="0" 
        max="100" 
        v-model="volumeLevel" 
        @input="updateVolume"
        class="volume-slider"
      />
      <span>{{ Math.round(volumeLevel) }}%</span>
    </div>

    <div class="bass-trigger">
      <h3>Bass Trigger</h3>
      <button 
        @click="triggerBassEffect" 
        :class="{ active: isTriggering }"
        class="bass-button"
      >
        {{ isTriggering ? 'Triggered!' : 'Bass Trigger' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Available presets
const presets = {
  chill: { 
    name: 'Chill',
    color: '#4ade80', 
    intensity: 1, 
    size: 2,
    type: 'sparkle'
  },
  energetic: { 
    name: 'Energetic',
    color: '#f87171', 
    intensity: 2, 
    size: 3,
    type: 'explosion'
  },
  ambient: { 
    name: 'Ambient',
    color: '#60a5fa', 
    intensity: 0.5, 
    size: 1,
    type: 'flow'
  }
};

// State management
const currentPreset = ref('chill');
const volumeLevel = ref(50);
const isTriggering = ref(false);
const triggerTimeout = ref<NodeJS.Timeout | null>(null);

// Change preset
const changePreset = (presetName: string) => {
  if (presets[presetName]) {
    currentPreset.value = presetName;
    // Emit event to particle components
    window.dispatchEvent(new CustomEvent('presetChange', { detail: presetName }));
  }
};

// Update volume level
const updateVolume = () => {
  // Emit event to particle components
  window.dispatchEvent(new CustomEvent('volumeChange', { detail: volumeLevel.value }));
};

// Trigger bass effect manually
const triggerBassEffect = () => {
  if (isTriggering.value) return;
  
  isTriggering.value = true;
  // Emit bass trigger event
  window.dispatchEvent(new CustomEvent('bassTrigger'));
  
  // Reset after delay
  if (triggerTimeout.value) clearTimeout(triggerTimeout.value);
  triggerTimeout.value = setTimeout(() => {
    isTriggering.value = false;
  }, 500);
};

// Cleanup on unmount
onUnmounted(() => {
  if (triggerTimeout.value) clearTimeout(triggerTimeout.value);
});
</script>

<style scoped>
.audio-controller {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  color: white;
  z-index: 101;
  max-width: 300px;
}

.preset-controls h3,
.volume-control h3,
.bass-trigger h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1rem;
}

.preset-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-buttons button {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-buttons button:hover,
.preset-buttons button.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.volume-slider {
  width: 100%;
  margin: 10px 0;
}

.bass-button {
  padding: 10px 16px;
  background: #ef4444;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.bass-button:hover {
  background: #dc2626;
}

.bass-button.active {
  background: #f59e0b;
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>