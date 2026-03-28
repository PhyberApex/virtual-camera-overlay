<script setup lang="ts">
import { defineProps, computed } from 'vue'
import WidgetBase from './WidgetBase.vue'

const props = defineProps<{
  id: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  entityId: string
  unit?: string
  displayName?: string
}>()

// Example sensor data - in a real implementation this would fetch from HomeAssistant
const sensorData = computed(() => {
  return {
    value: 65,
    unit: props.unit || '',
    entity_id: props.entityId,
    name: props.displayName || props.entityId
  }
})

// Compute the display text
const displayText = computed(() => {
  return `${sensorData.value.value}${sensorData.value.unit}`
})
</script>

<template>
  <WidgetBase 
    :id="id"
    type="sensor"
    :position="position"
    :size="size"
  >
    <div class="widget-sensor">
      <div class="sensor-name">{{ sensorData.name }}</div>
      <div class="sensor-value">{{ displayText }}</div>
    </div>
  </WidgetBase>
</template>

<style scoped>
.widget-sensor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.sensor-name {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 4px;
  text-align: center;
}

.sensor-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #fff;
}
</style>