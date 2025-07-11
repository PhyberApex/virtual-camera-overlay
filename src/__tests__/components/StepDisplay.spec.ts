import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import StepsDisplay from '../../components/StepsDisplay.vue';
import type { ComponentPublicInstance } from 'vue';

// Mock the homeAssistant composable
vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    steps: 1500,
    distance: 2000,
    speed: 4.5,
    isActive: true,
  }),
}));

describe('StepsDisplay', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>;

  beforeEach(() => {
    wrapper = mount(StepsDisplay);
  });

  it('renders when isActive is true', () => {
    expect(wrapper.find('.overlay-container').exists()).toBe(true);
  });

  it('displays the correct steps value', () => {
    const stepsValue = wrapper.find('.stats-value').text();
    expect(stepsValue).toBe('1500');
  });

  it('displays the correct steps value', () => {
    const distanceValue = wrapper.findAll('.stats-value')[1]?.text();
    expect(distanceValue).toBe('2000');
  });

  it('displays the correct speed value', () => {
    const speedValue = wrapper.findAll('.stats-value')[2]?.text();
    expect(speedValue).toBe('4.5');
  });

  it('displays the correct labels', () => {
    const labels = wrapper.findAll('.stats-label');
    expect(labels[0]?.text()).toBe('steps');
    expect(labels[1]?.text()).toBe('meters');
    expect(labels[2]?.text()).toBe('km/h');
  });
});
