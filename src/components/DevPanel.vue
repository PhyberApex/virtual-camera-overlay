<template>
  <div
    v-if="isDev"
    class="fixed top-3 left-3 w-64 bg-opacity-90 bg-gray-800 text-white rounded-lg font-mono text-sm z-100 pointer-events-auto shadow-lg border border-white border-opacity-10"
  >
    <div
      class="px-3 py-2 bg-gray-700 bg-opacity-80 rounded-t-lg font-bold cursor-pointer border-b border-white border-opacity-10"
    >
      Development Panel
    </div>
    <div class="p-3">
      <div class="flex justify-between items-center mb-2">
        <p>Connection</p>
        <select class="bg-gray-700 rounded px-1 text-sm" @input="updateConnectionState">
          <option value="connected">Connected</option>
          <option value="authenticating">Authenticating</option>
          <option value="disconnected">Disconnected</option>
        </select>
      </div>
      <div class="flex justify-between items-center mb-2">
        <p>Step data</p>
        <div class="space-x-2">
          <button class="bg-gray-700 px-2 py-1 rounded text-xs" @click="startMockStepData">
            Start
          </button>
          <button class="bg-gray-700 px-2 py-1 rounded text-xs" @click="stopMockStepData">
            Stop
          </button>
        </div>
      </div>
      <div class="flex justify-between items-center mb-2">
        <p>Send Events</p>
        <select v-model="eventToFire" class="bg-gray-700 rounded px-1 text-sm">
          <option value="brb">Be right back</option>
        </select>
        <button class="bg-gray-700 px-2 py-1 rounded text-xs" @click="fireEvent">Fire</button>
      </div>
      <div class="border-t border-white border-opacity-10 pt-2 mt-2 text-xs leading-relaxed">
        <div>
          Connection: <span :class="connectionClass">{{ connectionState }}</span>
        </div>
        <div>Steps: {{ steps }}</div>
        <div>Speed: {{ speed }} km/h</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';
import { onKeyStroke } from '@vueuse/core';

const {
  steps,
  speed,
  connectionState,
  brbEnabled,
  startMockStepData,
  stopMockStepData,
  setConnectionState,
  setBrbEnabled,
} = useHomeAssistant(true);

const isDevFromEnv = computed(() => import.meta.env.DEV);
const isDevEnabledInternal = ref(false);

const isDev = computed(() => isDevFromEnv.value && isDevEnabledInternal.value);

onKeyStroke('u', () => {
  isDevEnabledInternal.value = !isDevEnabledInternal.value;
});

const connectionClass = computed(() => {
  return (
    {
      disconnected: 'text-red-500',
      authenticating: 'text-yellow-500',
      connected: 'text-green-500',
    }[connectionState.value] || 'text-gray-500'
  );
});

const updateConnectionState = e => {
  setConnectionState(e.target.value);
};

const eventToFire = ref('brb');

const fireEvent = () => {
  switch (eventToFire.value) {
    case 'brb':
      setBrbEnabled(!brbEnabled.value);
  }
};
</script>
