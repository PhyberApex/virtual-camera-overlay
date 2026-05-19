<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}>();

const style = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  width: `${props.size.width}px`,
  height: `${props.size.height}px`,
}));

const widgetName = computed(() => props.type.charAt(0).toUpperCase() + props.type.slice(1));
</script>

<template>
  <div class="widget-base" :style="style" :data-type="type">
    <div class="widget-header">
      <span class="widget-name">{{ widgetName }}</span>
    </div>
    <div class="widget-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.widget-base {
  position: absolute;
  border: 1px solid var(--color-border-subtle);
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-widget); /* unified radius */
  overflow: hidden;
  box-shadow: var(--shadow-ambient-low);
  display: flex;
  flex-direction: column;
}

/* REFINED: reduced opacity from 0.8 to 0.35 for subtlety */
.widget-base[data-type='steps'] {
  background-color: rgba(132, 204, 22, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
}

.widget-base[data-type='steps'] .widget-header {
  background-color: rgba(100, 160, 16, 0.6); /* reduced from 0.9 */
}

/* REFINED: lighter weight, small caps, letter-spacing, tighter padding */
.widget-header {
  padding: var(--spacing-header-v) var(--spacing-header-h); /* 8px 16px - tighter */
  background-color: rgba(30, 30, 30, 0.9);
  border-bottom: 2px solid var(--color-border-medium); /* 2px instead of 1px - more visible */
  font-size: 13px; /* slightly smaller */
  font-weight: 300; /* lighter weight for refinement */
  font-variant: small-caps; /* more sophisticated than uppercase */
  letter-spacing: 0.08em; /* spacious, refined feel */
  color: var(--color-text-secondary);
  opacity: 0.9;
}

/* REFINED: more generous content padding */
.widget-content {
  flex: 1;
  padding: var(--spacing-content-v) var(--spacing-content-h); /* 20px 24px - more generous */
  overflow: hidden;
}
</style>
