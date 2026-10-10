import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import HeartRate from '../../components/HeartRate.vue';
import type { WidgetAnchor, Vector2 } from '../../utils/widgetLayout';

const heartEnabled = ref(true);
const heartRate = ref(0);
const connectionLost = ref(false);
const maxHeartRate = ref(185);
const heartRateLayout = ref<{ anchor: WidgetAnchor; offset: Vector2 }>({
  anchor: 'top-left',
  offset: { x: 20, y: 20 },
});

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    heartEnabled,
    heartRate,
    connectionLost,
  }),
}));

vi.mock('../../composables/useOverlayConfig', () => ({
  useOverlayConfig: () => ({
    maxHeartRate,
    heartRateLayout,
  }),
}));

describe('HeartRate', () => {
  beforeEach(() => {
    heartRateLayout.value = { anchor: 'top-left', offset: { x: 20, y: 20 } };
    window.innerWidth = 1920;
  });

  it('is not rendered when there is no heart rate reading yet', () => {
    heartEnabled.value = true;
    heartRate.value = 0;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(false);
  });

  it('is rendered once a real reading arrives while enabled and connected', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(true);
    expect(wrapper.find('.bpm-value').text()).toBe('72');
  });

  it('hides when the connection is lost, even though a reading is still held', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = true;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(false);
  });

  it('derives the zone class and name from the configured maxHeartRate', () => {
    heartEnabled.value = true;
    heartRate.value = 150;
    connectionLost.value = false;
    maxHeartRate.value = 200;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').classes()).toContain('zone-exercise');
    expect(wrapper.find('.bpm-zone').text()).toBe('exercise');
  });

  it('positions the BPM display and pulse waves at the fallback top-left, 20/20 by default', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').attributes('style')).toContain('top: 20px');
    expect(wrapper.find('.bpm-display').attributes('style')).toContain('left: 20px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('top: 20px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('left: 20px');
  });

  it('positions the BPM display and pulse waves at the configured anchor and offset', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    heartRateLayout.value = { anchor: 'bottom-right', offset: { x: 40, y: 10 } };
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').attributes('style')).toContain('bottom: 10px');
    expect(wrapper.find('.bpm-display').attributes('style')).toContain('right: 40px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('bottom: 10px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('right: 40px');
  });

  it('reduces the offset on a mobile-width viewport while staying anchored to the configured corner', async () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    heartRateLayout.value = { anchor: 'bottom-right', offset: { x: 40, y: 10 } };
    window.innerWidth = 480;
    const wrapper = mount(HeartRate);
    await nextTick();

    expect(wrapper.find('.bpm-display').attributes('style')).toContain('bottom: 5px');
    expect(wrapper.find('.bpm-display').attributes('style')).toContain('right: 35px');
  });
});
