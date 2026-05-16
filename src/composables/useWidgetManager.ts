import { ref } from 'vue';

export interface Widget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  props?: Record<string, unknown>;
}

const widgets = ref<Widget[]>([]);

export function useWidgetManager() {
  const addWidget = (widget: Widget) => {
    widgets.value.push(widget);
  };

  const removeWidget = (id: string) => {
    widgets.value = widgets.value.filter(w => w.id !== id);
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    const index = widgets.value.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets.value[index] = { ...widgets.value[index]!, ...updates };
    }
  };

  const clearWidgets = () => {
    widgets.value = [];
  };

  return {
    widgets,
    addWidget,
    removeWidget,
    updateWidget,
    clearWidgets,
  };
}
