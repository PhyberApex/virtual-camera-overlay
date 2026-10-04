<template>
  <div>
    <DevPanel />

    <BeRightBack
      :image-urls="[
        'rain/janiswow.png',
        'rain/janiswhy.png',
        'rain/janisapproved.png',
        'rain/janisreally.png',
        'rain/mortyxmas.png',
      ]"
    />
    <HeartRate />

    <div class="widgets-layer">
      <template v-for="widget in widgets" :key="widget.id">
        <WidgetTemperature
          v-if="widget.type === 'temperature'"
          :id="widget.id"
          :position="widget.position"
          :size="widget.size"
          :entity-id="getWidgetEntityId(widget)"
          :unit="getWidgetUnit(widget)"
        />
        <WidgetSensor
          v-else-if="widget.type === 'sensor'"
          :id="widget.id"
          :position="widget.position"
          :size="widget.size"
          :entity-id="getWidgetEntityId(widget)"
          :unit="getWidgetUnit(widget)"
          :display-name="getWidgetDisplayName(widget)"
        />
        <WidgetSteps
          v-else-if="widget.type === 'steps'"
          :id="widget.id"
          :position="widget.position"
          :size="widget.size"
          :should-show="steps !== 0 && speed !== 0 && distance !== 0"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import DevPanel from './components/DevPanel.vue';
import BeRightBack from './components/BeRightBack.vue';
import HeartRate from './components/HeartRate.vue';
import WidgetTemperature from './components/WidgetTemperature.vue';
import WidgetSensor from './components/WidgetSensor.vue';
import WidgetSteps from './components/WidgetSteps.vue';
import { useHomeAssistant } from './composables/useHomeAssistant';
import { useWidgetManager, type Widget } from './composables/useWidgetManager';

const { steps, speed, distance, compactEnabled } = useHomeAssistant();
const { widgets, addWidget, updateWidget } = useWidgetManager();

const getWidgetEntityId = (widget: Widget): string =>
  (widget.props?.entityId as string | undefined) ?? '';
const getWidgetUnit = (widget: Widget): string | undefined =>
  widget.props?.unit as string | undefined;
const getWidgetDisplayName = (widget: Widget): string | undefined =>
  widget.props?.displayName as string | undefined;

const STEPS_WIDGET_MARGIN = 30;
const STEPS_WIDGET_SIZE = {
  normal: { width: 240, height: 190 },
  // Wide enough for the worst case ("99999 steps", "99999 meters", "9.9 km/h" at
  // 1.8rem/700 values + 1.4rem/400 labels) with margin for non-Inter fallback fonts.
  compact: { width: 600, height: 72 },
};

const getStepsWidgetLayout = () => {
  const size = compactEnabled.value ? STEPS_WIDGET_SIZE.compact : STEPS_WIDGET_SIZE.normal;
  return {
    size,
    position: {
      x: window.innerWidth - size.width - STEPS_WIDGET_MARGIN,
      y: window.innerHeight - size.height - STEPS_WIDGET_MARGIN,
    },
  };
};

const updateStepsWidgetLayout = () => {
  const existingWidget = widgets.value.find(w => w.id === 'steps-display');
  if (existingWidget) {
    updateWidget('steps-display', getStepsWidgetLayout());
  }
};

onMounted(() => {
  addWidget({
    id: 'steps-display',
    type: 'steps',
    ...getStepsWidgetLayout(),
    props: {},
  });

  // Update widget size and position on window resize
  window.addEventListener('resize', updateStepsWidgetLayout);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateStepsWidgetLayout);
});

watch(compactEnabled, updateStepsWidgetLayout);
</script>

<style>
#app {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.widgets-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
