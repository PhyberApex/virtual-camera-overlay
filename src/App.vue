<template>
  <div>
    <DevPanel />

    <BeRightBack />
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
          :should-show="steps !== 0 && speed !== 0 && distance !== 0 && !connectionLost"
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
import { useOverlayConfig, type OverlayWidgetConfig } from './composables/useOverlayConfig';
import { computeWidgetPosition } from './utils/widgetLayout';

const { steps, speed, distance, compactEnabled, connectionLost } = useHomeAssistant();
const { widgets, addWidget, updateWidget } = useWidgetManager();
const { widgets: widgetConfigs, ensureOverlayConfigLoaded } = useOverlayConfig();

const getWidgetEntityId = (widget: Widget): string =>
  (widget.props?.entityId as string | undefined) ?? '';
const getWidgetUnit = (widget: Widget): string | undefined =>
  widget.props?.unit as string | undefined;
const getWidgetDisplayName = (widget: Widget): string | undefined =>
  widget.props?.displayName as string | undefined;

// Wide enough for the worst case ("99999 steps", "99999 meters", "9.9 km/h" at
// 1.8rem/700 values + 1.4rem/400 labels) with margin for non-Inter fallback fonts.
const DEFAULT_STEPS_WIDGET_COMPACT_SIZE = { width: 600, height: 72 };

const getWidgetSize = (widgetConfig: OverlayWidgetConfig): { width: number; height: number } =>
  widgetConfig.type === 'steps' && compactEnabled.value
    ? (widgetConfig.compactSize ?? DEFAULT_STEPS_WIDGET_COMPACT_SIZE)
    : widgetConfig.size;

const buildWidget = (widgetConfig: OverlayWidgetConfig): Widget => {
  const size = getWidgetSize(widgetConfig);
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  return {
    id: widgetConfig.id,
    type: widgetConfig.type,
    size,
    position: computeWidgetPosition(widgetConfig.anchor, widgetConfig.offset, size, viewport),
    props: widgetConfig.props as Record<string, unknown> | undefined,
  };
};

const updateWidgetLayout = (widgetConfig: OverlayWidgetConfig): void => {
  updateWidget(widgetConfig.id, buildWidget(widgetConfig));
};

const updateAllWidgetLayouts = (): void => {
  widgetConfigs.value.forEach(updateWidgetLayout);
};

const updateStepsWidgetLayouts = (): void => {
  widgetConfigs.value
    .filter(widgetConfig => widgetConfig.type === 'steps')
    .forEach(updateWidgetLayout);
};

onMounted(async () => {
  const configValid = await ensureOverlayConfigLoaded();
  if (!configValid) return;

  widgetConfigs.value.forEach(widgetConfig => addWidget(buildWidget(widgetConfig)));

  // Update widget size and position on window resize
  window.addEventListener('resize', updateAllWidgetLayouts);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateAllWidgetLayouts);
});

watch(compactEnabled, updateStepsWidgetLayouts);
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
