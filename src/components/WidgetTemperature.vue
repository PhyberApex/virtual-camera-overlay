<script setup lang="ts">
import { defineProps, computed } from 'vue'
import WidgetBase from './WidgetBase.vue'

const props = defineProps<{
  id: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  entityId: string
  unit?: string
}>()

// Example temperature data - in a real implementation this would fetch from HomeAssistant
const temperatureData = computed(() => {
  return {
    value: 22.5,
    unit: props.unit || '°C',
    entity_id: props.entityId
  }
})

// Compute the display text
const displayText = computed(() => {
  return `${temperatureData.value.value}${temperatureData.value.unit}`
})
</script>

<template>
  <WidgetBase 
    :id="id"
    type="temperature"
    :position="position"
    :size="size"
  >
    <div class="widget-temperature">
      <div class="temperature-value">{{ displayText }}</div>
      <div class="temperature-entity">{{ entityId }}</div>
    </div>
  </WidgetBase>
</template>

<style scoped>
.widget-temperature {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.temperature-value {
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.temperature-entity {
  font-size: 0.8rem;
  color: #aaa;
}
</style>