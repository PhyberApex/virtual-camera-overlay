import { ref } from 'vue'

// Widget configuration type
export interface WidgetConfig {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  props?: Record<string, any>
}

// Base widget interface
export interface Widget {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  props?: Record<string, any>
}

// Widget manager composable
export function useWidgetManager() {
  const widgets = ref<Widget[]>([])
  
  // Add a new widget
  const addWidget = (widget: Widget) => {
    widgets.value.push(widget)
  }
  
  // Remove a widget by ID
  const removeWidget = (id: string) => {
    widgets.value = widgets.value.filter(widget => widget.id !== id)
  }
  
  // Update widget configuration
  const updateWidget = (id: string, updates: Partial<Widget>) => {
    const index = widgets.value.findIndex(widget => widget.id === id)
    if (index !== -1) {
      widgets.value[index] = { ...widgets.value[index], ...updates }
    }
  }
  
  // Get all widgets
  const getWidgets = () => {
    return widgets.value
  }
  
  // Clear all widgets
  const clearWidgets = () => {
    widgets.value = []
  }
  
  return {
    widgets: widgets,
    addWidget,
    removeWidget,
    updateWidget,
    getWidgets,
    clearWidgets
  }
}