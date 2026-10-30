<script setup lang="ts">
import { computed } from 'vue';
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

const { getEntityState, connectionLost } = useHomeAssistant();
const state = computed(() => getEntityState(props.entityId));
const shouldShow = computed(() => state.value !== undefined && !connectionLost.value);
const name = props.displayName ?? props.entityId;
</script>

<template>
  <WidgetBase v-if="shouldShow" :id="id" type="sensor" :position="position" :size="size">
    <div class="widget-sensor">
      <div class="sensor-name">{{ name }}</div>
      <div class="sensor-value">{{ state }}{{ unit ?? '' }}</div>
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
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-bottom: 4px;
  text-align: center;
}

.sensor-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text-primary);
}
</style>
