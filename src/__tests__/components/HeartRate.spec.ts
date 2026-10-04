import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import HeartRate from '../../components/HeartRate.vue';

const heartEnabled = ref(true);
const heartRate = ref(0);
const connectionLost = ref(false);
const maxHeartRate = ref(185);

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
  }),
}));

describe('HeartRate', () => {
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
});
