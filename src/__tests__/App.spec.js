import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';
import StepsDisplay from '../components/StepsDisplay.vue';
import DevPanel from '../components/DevPanel.vue';

// Mock the components
vi.mock('../components/StepsDisplay.vue', () => ({
  default: {
    name: 'StepsDisplay',
    template: '<div class="steps-display-mock"></div>',
  },
}));

vi.mock('../components/DevPanel.vue', () => ({
  default: {
    name: 'DevPanel',
    template: '<div class="dev-panel-mock"></div>',
  },
}));

// Mock the homeAssistant composable
vi.mock('./composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    connectionState: { value: 'connected' },
  }),
}));

describe('App', () => {
  it('renders correctly', () => {
    const wrapper = mount(App);
    expect(wrapper.find('.steps-display-mock').exists()).toBe(true);
    expect(wrapper.find('.dev-panel-mock').exists()).toBe(true);
  });

  it('does not show connection indicator when connected', () => {
    const wrapper = mount(App);
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});
