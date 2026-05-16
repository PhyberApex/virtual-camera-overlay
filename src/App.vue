<template>
  <div>
    <DevPanel />

    <div
      v-if="connectionState !== 'connected'"
      class="fixed top-2 right-2 px-2 py-1 rounded text-xs"
      :class="connectionIndicatorClass"
    >
      {{ connectionStatus }}
    </div>

    <StepsDisplay />
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
          :entity-id="widget.props?.entityId ?? ''"
          :unit="widget.props?.unit"
        />
        <WidgetSensor
          v-else-if="widget.type === 'sensor'"
          :id="widget.id"
          :position="widget.position"
          :size="widget.size"
          :entity-id="widget.props?.entityId ?? ''"
          :unit="widget.props?.unit"
          :display-name="widget.props?.displayName"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import StepsDisplay from './components/StepsDisplay.vue';
import DevPanel from './components/DevPanel.vue';
import BeRightBack from './components/BeRightBack.vue';
import HeartRate from './components/HeartRate.vue';
import WidgetTemperature from './components/WidgetTemperature.vue';
import WidgetSensor from './components/WidgetSensor.vue';
import { useHomeAssistant } from './composables/useHomeAssistant';
import { useWidgetManager } from './composables/useWidgetManager';

const { connectionState } = useHomeAssistant();
const { widgets } = useWidgetManager();

interface StatusMap {
  disconnected: string;
  authenticating: string;
  connected: string;
  [key: string]: string;
}

interface ClassMap {
  disconnected: string;
  authenticating: string;
  connected: string;
  [key: string]: string;
}

const connectionStatus: ComputedRef<string> = computed(() => {
  const statuses: StatusMap = {
    disconnected: 'Disconnected',
    authenticating: 'Connecting...',
    connected: 'Connected',
  };
  return statuses[connectionState.value] || 'Unknown status';
});

const connectionIndicatorClass: ComputedRef<string> = computed(() => {
  const classes: ClassMap = {
    disconnected: 'bg-red-500 bg-opacity-70 text-white',
    authenticating: 'bg-yellow-500 bg-opacity-70 text-black',
    connected: 'bg-green-500 bg-opacity-70 text-white',
  };
  return classes[connectionState.value] || 'bg-gray-500 bg-opacity-70 text-white';
});
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
