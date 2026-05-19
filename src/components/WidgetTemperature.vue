<script setup lang="ts">
import WidgetBase from './WidgetBase.vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';

const props = defineProps<{
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  entityId: string;
  unit?: string;
}>();

const { getEntityState } = useHomeAssistant();
const displayUnit = props.unit ?? '°C';
</script>

<template>
  <WidgetBase :id="id" type="temperature" :position="position" :size="size">
    <div class="widget-temperature">
      <div class="temperature-value">{{ getEntityState(entityId) }}{{ displayUnit }}</div>
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
