import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowMount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import App from '../App.vue';
import { STAGE_SIZE } from '../utils/widgetLayout';
import CameraLayer from '../components/CameraLayer.vue';
import WidgetSteps from '../components/WidgetSteps.vue';
import { computed, nextTick, ref } from 'vue';
import type { Widget } from '../composables/useWidgetManager';
import type { OverlayWidgetConfig } from '../composables/useOverlayConfig';

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

const cameraStatus = ref('live');
const startCamera = vi.fn();
const stopCamera = vi.fn();
const cameraMirror = ref(false);
vi.mock('../composables/useCamera', () => ({
  SAMPLE_VIDEO_URL: 'dev-sample.mp4',
  useCamera: () => ({
    stream: ref(null),
    status: cameraStatus,
    source: ref('webcam'),
    sampleMissing: ref(false),
    start: startCamera,
    stop: stopCamera,
    setSource: vi.fn(),
    setSampleMissing: vi.fn(),
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

const defaultStepsWidgetConfig: OverlayWidgetConfig = {
  id: 'steps-display',
  type: 'steps',
  anchor: 'bottom-right',
  offset: { x: 30, y: 30 },
  size: { width: 240, height: 190 },
};

const widgetConfigs = ref<OverlayWidgetConfig[]>([defaultStepsWidgetConfig]);
const configValid = ref(true);
const configLoaded = ref(true);

vi.mock('../composables/useOverlayConfig', () => ({
  useOverlayConfig: () => ({
    widgets: widgetConfigs,
    entities: ref(null),
    maxHeartRate: ref(185),
    camera: computed(() => ({ mirror: cameraMirror.value })),
    configLoaded,
    ensureOverlayConfigLoaded: () => Promise.resolve(configValid.value),
  }),
}));

// Mounted apps share the mocked config refs, so unmount each so only the current app reacts.
enableAutoUnmount(afterEach);

describe('App', () => {
  beforeEach(() => {
    connectionState.value = 'disconnected';
    compactEnabled.value = false;
    steps.value = 0;
    speed.value = 0;
    distance.value = 0;
    connectionLost.value = false;
    cameraStatus.value = 'live';
    cameraMirror.value = false;
    startCamera.mockClear();
    stopCamera.mockClear();
    widgets.value = [];
    widgetConfigs.value = [defaultStepsWidgetConfig];
    configValid.value = true;
    configLoaded.value = true;
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

  it('positions the steps widget 240x190, 30px from the bottom-right corner, when compact mode is off', async () => {
    shallowMount(App);
    await flushPromises();
    const widget = widgets.value.find(w => w.id === 'steps-display');

    expect(widget?.size).toEqual({ width: 240, height: 190 });
    expect(widget?.position).toEqual({
      x: STAGE_SIZE.width - 240 - 30,
      y: STAGE_SIZE.height - 190 - 30,
    });
  });

  it('resizes to a header-less, <=72px tall layout and keeps the 30px margin when compact mode is toggled on', async () => {
    shallowMount(App);
    await flushPromises();
    compactEnabled.value = true;
    await nextTick();

    const widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.size.height).toBeLessThanOrEqual(72);
    expect(widget?.position).toEqual({
      x: STAGE_SIZE.width - widget!.size.width - 30,
      y: STAGE_SIZE.height - widget!.size.height - 30,
    });
  });

  it('uses the default 600x72 compact size when the steps widget has no configured compactSize', async () => {
    shallowMount(App);
    await flushPromises();
    compactEnabled.value = true;
    await nextTick();

    const widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.size).toEqual({ width: 600, height: 72 });
  });

  it("uses the steps widget's configured compactSize instead of the 600x72 default", async () => {
    widgetConfigs.value = [
      { ...defaultStepsWidgetConfig, compactSize: { width: 500, height: 50 } },
    ];
    shallowMount(App);
    await flushPromises();
    compactEnabled.value = true;
    await nextTick();

    const widget = widgets.value.find(w => w.id === 'steps-display');
    expect(widget?.size).toEqual({ width: 500, height: 50 });
  });

  it('hides the steps widget when connectionLost is true, even with non-zero data', async () => {
    steps.value = 1000;
    speed.value = 3;
    distance.value = 500;
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(true);

    connectionLost.value = true;
    await nextTick();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(false);
  });

  it('shows the steps widget when the treadmill is paused (speed is 0 but steps remain)', async () => {
    steps.value = 1000;
    speed.value = 0;
    distance.value = 500;
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(true);
  });

  it('hides the steps widget when steps is 0, regardless of speed, distance, or connection state', async () => {
    steps.value = 0;
    speed.value = 3;
    distance.value = 500;
    connectionLost.value = false;
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(false);
  });

  it('keeps widget positions in stage units after a window resize and only rescales the stage', async () => {
    const wrapper = shallowMount(App);
    await flushPromises();
    const before = widgets.value.find(w => w.id === 'steps-display')!.position;

    window.innerWidth = 960;
    window.innerHeight = 900;
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(widgets.value.find(w => w.id === 'steps-display')!.position).toEqual(before);
    const style = wrapper.find('.stage').attributes('style');
    expect(style).toContain('width: 1920px');
    expect(style).toContain('height: 1080px');
    expect(style).toContain('scale(0.5)');
    expect(style).toContain('left: 0px');
    expect(style).toContain('top: 180px');
  });

  it('positions a widget anchored top-left using its configured offset directly', async () => {
    const topLeftWidget: OverlayWidgetConfig = {
      id: 'office-temp',
      type: 'temperature',
      anchor: 'top-left',
      offset: { x: 15, y: 20 },
      size: { width: 150, height: 100 },
      props: { entityId: 'sensor.office_temperature' },
    };
    widgetConfigs.value = [defaultStepsWidgetConfig, topLeftWidget];

    shallowMount(App);
    await flushPromises();

    const widget = widgets.value.find(w => w.id === 'office-temp');
    expect(widget?.position).toEqual({ x: 15, y: 20 });
    expect(widget?.size).toEqual({ width: 150, height: 100 });
  });

  it('adds a newly configured widget without any code change, subscribing it at mount', async () => {
    const sensorWidget: OverlayWidgetConfig = {
      id: 'custom-sensor',
      type: 'sensor',
      anchor: 'top-right',
      offset: { x: 10, y: 10 },
      size: { width: 120, height: 80 },
      props: { entityId: 'sensor.custom', displayName: 'Custom' },
    };
    widgetConfigs.value = [defaultStepsWidgetConfig, sensorWidget];

    shallowMount(App);
    await flushPromises();

    expect(widgets.value.map(w => w.id)).toEqual(['steps-display', 'custom-sensor']);
  });

  it('renders no widgets when the overlay config is invalid', async () => {
    configValid.value = false;

    shallowMount(App);
    await flushPromises();

    expect(widgets.value).toHaveLength(0);
    expect(addWidget).not.toHaveBeenCalled();
  });

  it('adds widgets without remounting once the config loads after an initial failure', async () => {
    configValid.value = false;
    configLoaded.value = false;

    shallowMount(App);
    await flushPromises();
    expect(addWidget).not.toHaveBeenCalled();

    configLoaded.value = true;
    await flushPromises();

    expect(addWidget).toHaveBeenCalledTimes(1);
    expect(widgets.value.map(w => w.id)).toEqual(['steps-display']);
  });

  it('does not add widgets twice when the config is already loaded on mount', async () => {
    shallowMount(App);
    await flushPromises();

    expect(addWidget).toHaveBeenCalledTimes(1);
  });

  it('starts the camera on mount and stops it on unmount', () => {
    const wrapper = shallowMount(App);
    expect(startCamera).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    expect(stopCamera).toHaveBeenCalledTimes(1);
  });

  it.each(['denied', 'unavailable', 'ended'])(
    'keeps the widgets layer mounted and live when the camera is %s',
    async status => {
      cameraStatus.value = status;
      steps.value = 1000;
      const wrapper = shallowMount(App);
      await flushPromises();
      expect(wrapper.find('.widgets-layer').exists()).toBe(true);
      expect(wrapper.findComponent(WidgetSteps).props('shouldShow')).toBe(true);
    }
  );

  it('passes the configured mirror flag to the camera layer', async () => {
    cameraMirror.value = true;
    const wrapper = shallowMount(App);
    expect(wrapper.findComponent(CameraLayer).props('mirror')).toBe(true);
  });
});
