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
}>();

const { getEntityState, connectionLost } = useHomeAssistant();
const state = computed(() => getEntityState(props.entityId));
const shouldShow = computed(() => state.value !== undefined && !connectionLost.value);
const displayUnit = props.unit ?? '°C';
</script>

<template>
  <WidgetBase v-if="shouldShow" :id="id" type="temperature" :position="position" :size="size">
    <div class="widget-temperature">
      <div class="temperature-value">{{ state }}{{ displayUnit }}</div>
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
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.temperature-entity {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-text-muted);
}
</style>
