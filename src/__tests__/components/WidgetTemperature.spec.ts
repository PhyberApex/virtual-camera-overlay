import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import WidgetTemperature from '../../components/WidgetTemperature.vue';

const connectionLost = ref(false);

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    connectionLost,
    getEntityState: (entityId: string) =>
      entityId === 'sensor.living_room_temp' ? 21.5 : undefined,
  }),
}));

const baseProps = {
  id: 'temp-1',
  position: { x: 0, y: 0 },
  size: { width: 150, height: 100 },
  entityId: 'sensor.living_room_temp',
};

describe('WidgetTemperature', () => {
  beforeEach(() => {
    connectionLost.value = false;
  });

  it('displays entity state with default unit', () => {
    const wrapper = mount(WidgetTemperature, { props: baseProps });
    expect(wrapper.find('.temperature-value').text()).toBe('21.5°C');
  });

  it('displays entity state with custom unit', () => {
    const wrapper = mount(WidgetTemperature, { props: { ...baseProps, unit: '°F' } });
    expect(wrapper.find('.temperature-value').text()).toBe('21.5°F');
  });

  it('displays the entity id', () => {
    const wrapper = mount(WidgetTemperature, { props: baseProps });
    expect(wrapper.find('.temperature-entity').text()).toBe('sensor.living_room_temp');
  });

  it('renders no frame when the entity has no state', () => {
    const wrapper = mount(WidgetTemperature, {
      props: { ...baseProps, entityId: 'sensor.missing' },
    });
    expect(wrapper.html()).toBe('<!--v-if-->');
  });

  it('renders no frame while the connection is lost', () => {
    connectionLost.value = true;
    const wrapper = mount(WidgetTemperature, { props: baseProps });
    expect(wrapper.html()).toBe('<!--v-if-->');
  });
});
