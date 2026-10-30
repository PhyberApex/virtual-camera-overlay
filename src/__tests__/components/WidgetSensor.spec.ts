import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import WidgetSensor from '../../components/WidgetSensor.vue';

const connectionLost = ref(false);

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    connectionLost,
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
  beforeEach(() => {
    connectionLost.value = false;
  });

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

  it('renders no frame when the entity has no state', () => {
    const wrapper = mount(WidgetSensor, { props: { ...baseProps, entityId: 'sensor.missing' } });
    expect(wrapper.html()).toBe('<!--v-if-->');
  });

  it('renders no frame while the connection is lost', () => {
    connectionLost.value = true;
    const wrapper = mount(WidgetSensor, { props: baseProps });
    expect(wrapper.html()).toBe('<!--v-if-->');
  });
});
