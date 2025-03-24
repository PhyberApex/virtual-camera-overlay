<template>
  <div v-if="steps !== 0 && speed !== 0" class="overlay-container">
    <div class="stats-display">
      <div class="stats-row">
        <span class="stats-value">{{ steps }}</span>
        <span class="stats-label">steps</span>
      </div>
      <div class="stats-row">
        <span class="stats-value">{{ speed }}</span>
        <span class="stats-label">km/h</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHomeAssistant } from '../composables/useHomeAssistant';

// Get the steps and speed from the home assistant composable
// They're already readonly refs as defined in the useHomeAssistant composable
const { steps, speed } = useHomeAssistant();
</script>

<style scoped>
.overlay-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  justify-content: flex-end;
}

.stats-display {
  background-color: rgba(132, 204, 22, 0.8); /* Semi-transparent lime */
  border-radius: 10px;
  padding: 16px 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.stats-row {
  text-align: right;
  margin: 6px 0;
}

.stats-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.stats-label {
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.9);
  margin-left: 4px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
