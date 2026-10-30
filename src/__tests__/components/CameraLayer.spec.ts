import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import CameraLayer from '../../components/CameraLayer.vue';

const status = ref('live');
const source = ref('webcam');
vi.mock('../../composables/useCamera', () => ({
  SAMPLE_VIDEO_URL: 'dev-sample.mp4',
  useCamera: () => ({
    stream: ref(null),
    status,
    source,
    setSampleMissing: vi.fn(),
  }),
}));

describe('CameraLayer', () => {
  it('shows an unmirrored video when live', () => {
    status.value = 'live';
    const w = mount(CameraLayer, { props: { mirror: false } });
    expect(w.find('video').classes()).not.toContain('mirrored');
    expect(w.find('.camera-placeholder').exists()).toBe(false);
  });

  it('mirrors the video when requested', () => {
    status.value = 'live';
    const w = mount(CameraLayer, { props: { mirror: true } });
    expect(w.find('video').classes()).toContain('mirrored');
  });

  it.each(['denied', 'unavailable', 'ended'])('shows the placeholder when %s', async s => {
    status.value = s;
    const w = mount(CameraLayer, { props: { mirror: false } });
    await nextTick();
    expect(w.find('.camera-placeholder').text()).not.toBe('');
    expect(w.find('video').exists()).toBe(false);
  });
});
