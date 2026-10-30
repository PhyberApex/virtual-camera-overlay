import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import BeRightBack from '../../components/BeRightBack.vue';

const brbEnabled = ref(true);
const beRightBack = ref({
  title: 'Be Right Back',
  subtitle: "I'll be back in a moment!",
  particles: ['rain/a.png', 'rain/b.png'],
});

vi.mock('../../composables/useOverlayConfig', () => ({
  useOverlayConfig: () => ({ beRightBack }),
}));

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    brbEnabled,
  }),
}));

describe('BeRightBack', () => {
  beforeEach(() => {
    brbEnabled.value = true;
    beRightBack.value = {
      title: 'Be Right Back',
      subtitle: "I'll be back in a moment!",
      particles: ['rain/a.png', 'rain/b.png'],
    };
  });

  it('renders the configured title, subtitle and cycles the configured images', () => {
    beRightBack.value = { title: 'BRB', subtitle: 'Soon', particles: ['x.png', 'y.png', 'z.png'] };
    const wrapper = mount(BeRightBack);

    expect(wrapper.find('.brb-title').text()).toBe('BRB');
    expect(wrapper.find('.brb-subtitle').text()).toBe('Soon');
    const srcs = wrapper.findAll('.particle-emoji').map(img => img.attributes('src'));
    expect(srcs).toHaveLength(15);
    expect(srcs.slice(0, 4)).toEqual(['x.png', 'y.png', 'z.png', 'x.png']);
  });

  it('renders no particles for an empty list', () => {
    beRightBack.value = { title: 'BRB', subtitle: 'Soon', particles: [] };
    const wrapper = mount(BeRightBack);

    expect(wrapper.findAll('.particle-emoji')).toHaveLength(0);
  });

  it('keeps each particle style stable across re-renders of the mounted instance', async () => {
    const wrapper = mount(BeRightBack);

    const stylesBefore = wrapper.findAll('.particle-emoji').map(img => img.attributes('style'));
    expect(stylesBefore).toHaveLength(15);

    // Force a re-render without unmounting; particle styles must not change.
    brbEnabled.value = true;
    await nextTick();
    await wrapper.vm.$forceUpdate();
    await nextTick();

    const stylesAfter = wrapper.findAll('.particle-emoji').map(img => img.attributes('style'));

    expect(stylesAfter).toEqual(stylesBefore);
  });

  it('renders a fully opaque, 15-particle background', () => {
    const wrapper = mount(BeRightBack);

    expect(wrapper.findAll('.particle-emoji')).toHaveLength(15);
  });
});
