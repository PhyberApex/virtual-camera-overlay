import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import WidgetSteps from '../../components/WidgetSteps.vue';

const compactEnabled = ref(false);

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    steps: 1250,
    speed: 3.5,
    distance: 850,
    compactEnabled,
  }),
}));

describe('WidgetSteps', () => {
  const mountWidget = () =>
    mount(WidgetSteps, {
      props: {
        id: 'test-steps',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        shouldShow: true,
      },
    });

  it('renders with step data', () => {
    const wrapper = mountWidget();

    expect(wrapper.text()).toContain('1250');
    expect(wrapper.text()).toContain('steps');
    expect(wrapper.text()).toContain('3.5');
    expect(wrapper.text()).toContain('km/h');
    expect(wrapper.text()).toContain('850');
    expect(wrapper.text()).toContain('meters');
  });

  it('renders the header and stacked rows when compact mode is off', () => {
    compactEnabled.value = false;
    const wrapper = mountWidget();

    expect(wrapper.find('.widget-header').exists()).toBe(true);
    expect(wrapper.find('.widget-steps--compact').exists()).toBe(false);
  });

  it('renders header-less, single-row layout when compact mode is on', () => {
    compactEnabled.value = true;
    const wrapper = mountWidget();

    expect(wrapper.find('.widget-header').exists()).toBe(false);
    expect(wrapper.find('.widget-steps--compact').exists()).toBe(true);
    expect(wrapper.text()).toContain('1250');
    expect(wrapper.text()).toContain('steps');
    expect(wrapper.text()).toContain('3.5');
    expect(wrapper.text()).toContain('km/h');
    expect(wrapper.text()).toContain('850');
    expect(wrapper.text()).toContain('meters');
  });
});
