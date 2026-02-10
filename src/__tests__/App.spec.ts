import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import App from '../App.vue';
import { nextTick, ref } from 'vue';

const connectionState = ref('disconnected');
const brbEnabled = ref(false);
const heartEnabled = ref(false);
const heartRate = ref(70);
const steps = ref(0);
const speed = ref(0);
const distance = ref(0);

// Mock the homeAssistant composable
vi.mock('../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    connectionState,
    brbEnabled,
    heartEnabled,
    heartRate,
    steps,
    speed,
    distance,
  }),
}));

describe('App', () => {
  beforeEach(() => {
    connectionState.value = 'disconnected';
  });

  it('renders correctly', () => {
    const wrapper = shallowMount(App);
    expect(wrapper.isVisible()).toBe(true);
    expect(wrapper.find('.fixed').exists()).toBe(true);
  });

  it('does not show connection indicator when connected', async () => {
    const wrapper = shallowMount(App);
    connectionState.value = 'connected';
    await nextTick();
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});
