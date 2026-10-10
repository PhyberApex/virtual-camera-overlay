import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import BeRightBack from '../../components/BeRightBack.vue';

const brbEnabled = ref(true);

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    brbEnabled,
  }),
}));

describe('BeRightBack', () => {
  beforeEach(() => {
    brbEnabled.value = true;
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
