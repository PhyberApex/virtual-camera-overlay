<script setup lang="ts">
import WidgetBase from './WidgetBase.vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';

const props = defineProps<{
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  entityId: string;
  unit?: string;
  displayName?: string;
}>();

const { getEntityState } = useHomeAssistant();
const name = props.displayName ?? props.entityId;
</script>

<template>
  <WidgetBase :id="id" type="sensor" :position="position" :size="size">
    <div class="widget-sensor">
      <div class="sensor-name">{{ name }}</div>
      <div class="sensor-value">{{ getEntityState(entityId) }}{{ unit ?? '' }}</div>
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
