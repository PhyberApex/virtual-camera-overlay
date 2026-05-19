import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WidgetBase from '../../components/WidgetBase.vue';

const baseProps = {
  id: 'w1',
  type: 'temperature',
  position: { x: 10, y: 20 },
  size: { width: 150, height: 100 },
};

describe('WidgetBase', () => {
  it('renders with correct position and size styles', () => {
    const wrapper = mount(WidgetBase, { props: baseProps });
    const el = wrapper.find('.widget-base');
    expect(el.attributes('style')).toContain('left: 10px');
    expect(el.attributes('style')).toContain('top: 20px');
    expect(el.attributes('style')).toContain('width: 150px');
    expect(el.attributes('style')).toContain('height: 100px');
  });

  it('capitalises the type as the header label', () => {
    const wrapper = mount(WidgetBase, { props: baseProps });
    expect(wrapper.find('.widget-name').text()).toBe('Temperature');
  });

  it('renders slot content', () => {
    const wrapper = mount(WidgetBase, {
      props: baseProps,
      slots: { default: '<span class="slot-child">hello</span>' },
    });
    expect(wrapper.find('.slot-child').exists()).toBe(true);
  });
});
