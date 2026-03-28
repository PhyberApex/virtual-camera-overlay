# Widget System for HomeAssistant Data

## Overview

This widget system allows displaying HomeAssistant data in the virtual camera overlay. It provides a flexible framework for creating and managing widgets that can display various types of sensor data, temperatures, and other information.

## Core Components

### 1. `useWidgetManager` Composable
- Manages the collection of widgets
- Provides methods to add, remove, update, and retrieve widgets
- Handles widget positioning and sizing

### 2. `WidgetBase.vue`
- Base component for all widgets
- Provides common styling and layout
- Handles positioning and sizing through props

### 3. Example Widgets
- `WidgetTemperature.vue`: Displays temperature sensor data
- `WidgetSensor.vue`: Displays generic sensor data

## Usage

Widgets are defined with the following properties:
- `id`: Unique identifier for the widget
- `type`: Widget type (used for rendering)
- `position`: { x, y } coordinates
- `size`: { width, height } dimensions
- `props`: Additional configuration properties

Example widget definition:
```json
{
  "id": "temp-living-room",
  "type": "temperature",
  "position": { "x": 50, "y": 50 },
  "size": { "width": 150, "height": 100 },
  "props": {
    "entityId": "sensor.living_room_temperature",
    "unit": "°C"
  }
}
```

## Implementation Details

Widgets are rendered by the widget manager in the App.vue component. The system supports:
- Dynamic positioning and sizing
- Multiple widget types
- Extensible architecture for new widget types
- Responsive design principles