import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WidgetSteps from '../../components/WidgetSteps.vue';

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    steps: 1250,
    speed: 3.5,
    distance: 850,
  }),
}));

describe('WidgetSteps', () => {
  it('renders with step data', () => {
    const wrapper = mount(WidgetSteps, {
      props: {
        id: 'test-steps',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        shouldShow: true,
      },
    });

    expect(wrapper.text()).toContain('1250');
    expect(wrapper.text()).toContain('steps');
    expect(wrapper.text()).toContain('3.5');
    expect(wrapper.text()).toContain('km/h');
    expect(wrapper.text()).toContain('850');
    expect(wrapper.text()).toContain('meters');
  });
});
