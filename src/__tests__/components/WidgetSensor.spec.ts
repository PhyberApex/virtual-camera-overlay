import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WidgetSensor from '../../components/WidgetSensor.vue';

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    getEntityState: (entityId: string) => (entityId === 'sensor.humidity' ? 65 : undefined),
  }),
}));

const baseProps = {
  id: 'sensor-1',
  position: { x: 0, y: 0 },
  size: { width: 150, height: 100 },
  entityId: 'sensor.humidity',
};

describe('WidgetSensor', () => {
  it('displays entity state with unit', () => {
    const wrapper = mount(WidgetSensor, { props: { ...baseProps, unit: '%' } });
    expect(wrapper.find('.sensor-value').text()).toBe('65%');
  });

  it('displays entity state without unit', () => {
    const wrapper = mount(WidgetSensor, { props: baseProps });
    expect(wrapper.find('.sensor-value').text()).toBe('65');
  });

  it('uses displayName when provided', () => {
    const wrapper = mount(WidgetSensor, { props: { ...baseProps, displayName: 'Humidity' } });
    expect(wrapper.find('.sensor-name').text()).toBe('Humidity');
  });

  it('falls back to entityId when no displayName', () => {
    const wrapper = mount(WidgetSensor, { props: baseProps });
    expect(wrapper.find('.sensor-name').text()).toBe('sensor.humidity');
  });
});
