<script setup lang="ts">
import WidgetBase from './WidgetBase.vue';
import { useHomeAssistant } from '../composables/useHomeAssistant';

defineProps<{
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  shouldShow: boolean;
}>();

const { steps, speed, distance } = useHomeAssistant();
</script>

<template>
  <WidgetBase v-if="shouldShow" :id="id" type="steps" :position="position" :size="size">
    <div class="widget-steps">
      <div class="stats-row">
        <span class="stats-value">{{ Math.round(steps) }}</span>
        <span class="stats-label">steps</span>
      </div>
      <div class="stats-row">
        <span class="stats-value">{{ Math.round(distance) }}</span>
        <span class="stats-label">meters</span>
      </div>
      <div class="stats-row">
        <span class="stats-value">{{ speed.toFixed(1) }}</span>
        <span class="stats-label">km/h</span>
      </div>
    </div>
  </WidgetBase>
</template>

<style scoped>
.widget-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  justify-content: center;
  padding: 0; /* removed extra padding - content padding handles it */
}

.stats-row {
  text-align: right;
  line-height: 1.2;
}

/* REFINED: tabular-nums for alignment */
.stats-value {
  font-size: 1.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums; /* better number alignment */
  color: var(--color-text-primary);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* REFINED: tighter gap (4px->2px), letter-spacing for refinement */
.stats-label {
  font-size: 1.4rem;
  font-weight: 400;
  letter-spacing: 0.02em; /* subtle refinement */
  color: var(--color-text-secondary);
  margin-left: 6px; /* slightly more space */
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .widget-steps {
    gap: 4px;
  }

  .stats-value {
    font-size: 1.5rem;
  }

  .stats-label {
    font-size: 1.2rem;
  }
}
</style>
