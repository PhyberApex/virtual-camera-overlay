<template>
  <div>
    <!-- Development panel (only visible in dev mode) -->
    <DevPanel />

    <!-- Connection status indicator that only shows when disconnected -->
    <div
      v-if="connectionState !== 'connected'"
      class="fixed top-2 right-2 px-2 py-1 rounded text-xs"
      :class="connectionIndicatorClass"
    >
      {{ connectionStatus }}
    </div>

    <!-- Main overlay content -->
    <StepsDisplay />
    <BeRightBack
      :image-urls="[
        'rain/janiswow.png',
        'rain/janiswhy.png',
        'rain/janisapproved.png',
        'rain/janisreally.png',
        'rain/mortyxmas.png',
      ]"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import StepsDisplay from './components/StepsDisplay.vue';
import DevPanel from './components/DevPanel.vue';
import BeRightBack from './components/BeRightBack.vue';
import { useHomeAssistant } from './composables/useHomeAssistant';

const { connectionState } = useHomeAssistant();

const connectionStatus = computed(() => {
  const statuses = {
    disconnected: 'Disconnected',
    authenticating: 'Connecting...',
    connected: 'Connected',
  };
  return statuses[connectionState.value] || 'Unknown status';
});

const connectionIndicatorClass = computed(() => {
  const classes = {
    disconnected: 'bg-red-500 bg-opacity-70 text-white',
    authenticating: 'bg-yellow-500 bg-opacity-70 text-black',
    connected: 'bg-green-500 bg-opacity-70 text-white',
  };
  return classes[connectionState.value] || 'bg-gray-500 bg-opacity-70 text-white';
});
</script>

<style>
/* Add specific overlay styles */
#app {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* Allow clicking through the overlay */
}
</style>
