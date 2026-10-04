import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import App from '../App.vue';
import WidgetSteps from '../components/WidgetSteps.vue';
import { nextTick, ref } from 'vue';
import type { Widget } from '../composables/useWidgetManager';

const connectionState = ref('disconnected');
const brbEnabled = ref(false);
const heartEnabled = ref(false);
const compactEnabled = ref(false);
const heartRate = ref(70);
const steps = ref(0);
const speed = ref(0);
const distance = ref(0);
const connectionLost = ref(false);

vi.mock('../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    connectionState,
    brbEnabled,
    heartEnabled,
    compactEnabled,
    heartRate,
    steps,
    speed,
    distance,
    connectionLost,
    getEntityState: () => undefined,
  }),
}));

const widgets = ref<Widget[]>([]);
const addWidget = vi.fn((widget: Widget) => {
  widgets.value.push(widget);
});
const updateWidget = vi.fn((id: string, updates: Partial<Widget>) => {
  const index = widgets.value.findIndex(w => w.id === id);
  if (index !== -1) {
    widgets.value[index] = { ...widgets.value[index]!, ...updates };
  }
});

vi.mock('../composables/useWidgetManager', () => ({
  useWidgetManager: () => ({
    widgets,
    addWidget,
    updateWidget,
  }),
}));

describe('App', () => {
  beforeEach(() => {
    connectionState.value = 'disconnected';
    compactEnabled.value = false;
    steps.value = 0;
    speed.value = 0;
    distance.value = 0;
    connectionLost.value = false;
    widgets.value = [];
    addWidget.mockClear();
    updateWidget.mockClear();
  });

  it('renders correctly', () => {
    const wrapper = shallowMount(App);
    expect(wrapper.isVisible()).toBe(true);
  });

  it.each(['disconnected', 'authenticating', 'connected'] as const)(
    'renders no connection-status element when connection state is %s',
    async state => {
      const wrapper = shallowMount(App);
      connectionState.value = state;
      await nextTick();
      expect(wrapper.text()).not.toMatch(/Disconnected|Connecting\.\.\.|Connected/);
    }
  );

  it('positions the steps widget 240x190, 30px from the bottom-right corner, when compact mode is off', () => {
    shallowMount(App);
    const widget = widgets.value.find(w => w.id === 'steps-display');

    expect(widget?.size).toEqual({ width: 240, height: 190 });
    expect(widget?.position).toEqual({
      x: window.innerWidth - 240 - 30,
      y: window.innerHeight - 190 - 30,
    });
  });

  it('resizes to a header-less, <=72px tall layout and keeps the 30px margin when compact mode is toggled on', async () => {
    shallowMount(App);
    compactEnabled.value = true;
    await nextTick();

    const widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.size.height).toBeLessThanOrEqual(72);
    expect(widget?.position).toEqual({
      x: window.innerWidth - widget!.size.width - 30,
      y: window.innerHeight - widget!.size.height - 30,
    });
  });

  it('hides the steps widget when connectionLost is true, even with non-zero data', async () => {
    steps.value = 1000;
    speed.value = 3;
    distance.value = 500;
    const wrapper = shallowMount(App);
    await nextTick();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(true);

    connectionLost.value = true;
    await nextTick();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(false);
  });

  it('keeps the 30px margin after a window resize, in both modes', async () => {
    shallowMount(App);

    window.innerWidth = 1280;
    window.innerHeight = 900;
    window.dispatchEvent(new Event('resize'));

    let widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.position).toEqual({
      x: 1280 - widget!.size.width - 30,
      y: 900 - widget!.size.height - 30,
    });

    compactEnabled.value = true;
    await nextTick();
    window.innerWidth = 1920;
    window.innerHeight = 1080;
    window.dispatchEvent(new Event('resize'));

    widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.position).toEqual({
      x: 1920 - widget!.size.width - 30,
      y: 1080 - widget!.size.height - 30,
    });
  });
});
