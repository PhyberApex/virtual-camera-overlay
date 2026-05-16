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
  <div class="widget-base" :style="style">
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
  border: 1px solid #333;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.widget-header {
  padding: 8px 12px;
  background-color: rgba(30, 30, 30, 0.9);
  border-bottom: 1px solid #444;
  font-size: 14px;
  color: #ddd;
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}
</style>
