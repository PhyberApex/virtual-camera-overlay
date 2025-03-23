<template>
    <div v-if="isDev" class="dev-panel">
      <div class="dev-panel-header">Development Panel</div>
      <div class="dev-panel-content">
        <div class="dev-panel-row">
          <label for="mockData">Mock Data:</label>
          <input 
            type="checkbox" 
            id="mockData" 
            :checked="useMockData" 
            @change="toggleMockData" 
          />
        </div>
        <div class="stats-info">
          <div>Connection: <span :class="connectionClass">{{ connectionState }}</span></div>
          <div>Steps: {{ steps }}</div>
          <div>Speed: {{ speed }} km/h</div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { useHomeAssistant } from '../composables/useHomeAssistant';
  
  const { steps, speed, connectionState, useMockData, toggleMockData } = useHomeAssistant();
  
  const isDev = computed(() => import.meta.env.DEV);
  
  const connectionClass = computed(() => {
    return {
      'disconnected': 'text-red-500',
      'authenticating': 'text-yellow-500',
      'connected': 'text-green-500'
    }[connectionState.value] || 'text-gray-500';
  });
  </script>
  
  <style scoped>
  .dev-panel {
    position: fixed;
    top: 10px;
    left: 10px;
    width: 250px;
    background-color: rgba(30, 30, 30, 0.9);
    color: white;
    border-radius: 8px;
    font-family: monospace;
    font-size: 14px;
    z-index: 9999;
    pointer-events: auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dev-panel-header {
    padding: 8px 12px;
    background-color: rgba(50, 50, 50, 0.8);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dev-panel-content {
    padding: 10px;
  }
  
  .dev-panel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .stats-info {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 8px;
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;
  }
  
  .text-red-500 {
    color: #f87171;
  }
  
  .text-yellow-500 {
    color: #fbbf24;
  }
  
  .text-green-500 {
    color: #4ade80;
  }
  
  input[type="checkbox"] {
    transform: scale(1.2);
    cursor: pointer;
  }
  </style>