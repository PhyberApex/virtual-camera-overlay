<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWidgetManager } from './composables/useWidgetManager'
import WidgetTemperature from './components/WidgetTemperature.vue'
import WidgetSensor from './components/WidgetSensor.vue'

const { addWidget } = useWidgetManager()

// Example widgets to demonstrate the system
const exampleWidgets = [
  {
    id: 'temp-living-room',
    type: 'temperature',
    position: { x: 50, y: 50 },
    size: { width: 150, height: 100 },
    props: {
      entityId: 'sensor.living_room_temperature',
      unit: '°C'
    }
  },
  {
    id: 'humidity-living-room',
    type: 'sensor',
    position: { x: 220, y: 50 },
    size: { width: 150, height: 100 },
    props: {
      entityId: 'sensor.living_room_humidity',
      unit: '%',
      displayName: 'Humidity'
    }
  }
]

onMounted(() => {
  // Add example widgets when the app mounts
  exampleWidgets.forEach(widget => {
    addWidget(widget)
  })
})
</script>

<template>
  <div class="app-container">
    <h1>Virtual Camera Overlay - Widget System</h1>
    <p>This demo shows the widget system for displaying HomeAssistant data.</p>
    
    <!-- Placeholder for widgets to be rendered by the manager -->
    <div class="widgets-container">
      <WidgetTemperature 
        v-for="widget in exampleWidgets.filter(w => w.type === 'temperature')"
        :key="widget.id"
        :id="widget.id"
        :position="widget.position"
        :size="widget.size"
        :entity-id="widget.props.entityId"
        :unit="widget.props.unit"
      />
      
      <WidgetSensor 
        v-for="widget in exampleWidgets.filter(w => w.type === 'sensor')"
        :key="widget.id"
        :id="widget.id"
        :position="widget.position"
        :size="widget.size"
        :entity-id="widget.props.entityId"
        :unit="widget.props.unit"
        :display-name="widget.props.displayName"
      />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.widgets-container {
  position: relative;
  width: 100%;
  height: 500px;
  border: 1px solid #ccc;
  margin-top: 20px;
  background-color: #111;
}
</style>