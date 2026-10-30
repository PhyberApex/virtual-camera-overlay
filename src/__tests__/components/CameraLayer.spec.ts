import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { nextTick, ref, watchEffect } from 'vue';
import gsap from 'gsap';
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

const faceBox = ref<{ x: number; y: number; width: number; height: number } | null>(null);
const tracked = ref(false);
const trackingEnabled = ref(false);
vi.mock('../../composables/useFaceTracking', () => ({
  useFaceTracking: (options: { enabled: { value: boolean } }) => {
    watchEffect(() => {
      trackingEnabled.value = options.enabled.value;
    });
    return { faceBox, tracked };
  },
}));

describe('CameraLayer', () => {
  it('applies the blur class only when blurred', async () => {
    status.value = 'live';
    const w = mount(CameraLayer, { props: { mirror: false } });
    expect(w.classes()).not.toContain('blurred');
    await w.setProps({ blurred: true });
    expect(w.classes()).toContain('blurred');
  });

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

enableAutoUnmount(afterEach);

describe('CameraLayer auto-framing', () => {
  const framing = { maxZoom: 1.5, deadZone: 0.05, easeMs: 500, targetY: 1 / 3 };
  let toSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    status.value = 'live';
    source.value = 'webcam';
    faceBox.value = null;
    tracked.value = false;
    toSpy = vi.spyOn(gsap, 'to').mockImplementation(() => ({}) as gsap.core.Tween);
  });

  afterEach(() => {
    toSpy.mockRestore();
  });

  it('eases the frame towards the framing for a tracked face over easeMs', async () => {
    mount(CameraLayer, { props: { mirror: false, framing } });
    faceBox.value = { x: 860, y: 440, width: 200, height: 200 };
    tracked.value = true;
    await nextTick();
    expect(toSpy).toHaveBeenCalledTimes(1);
    const vars = toSpy.mock.calls[0][1] as Record<string, number>;
    expect(vars.scale).toBeCloseTo(1.5);
    expect(vars.y).toBeCloseTo(-180);
    expect(vars.duration).toBeCloseTo(0.5);
  });

  it('eases back to the full frame when the face is lost', async () => {
    mount(CameraLayer, { props: { mirror: false, framing } });
    faceBox.value = { x: 860, y: 440, width: 200, height: 200 };
    tracked.value = true;
    await nextTick();
    tracked.value = false;
    faceBox.value = null;
    await nextTick();
    expect(toSpy).toHaveBeenCalledTimes(2);
    expect(toSpy.mock.calls[1][1]).toMatchObject({ x: 0, y: 0, scale: 1 });
  });

  it('does not animate when nothing is tracked', async () => {
    mount(CameraLayer, { props: { mirror: false, framing } });
    await nextTick();
    expect(toSpy).not.toHaveBeenCalled();
  });

  it('turns face tracking off while the placeholder is shown', async () => {
    status.value = 'denied';
    mount(CameraLayer, { props: { mirror: false, framing } });
    await nextTick();
    expect(trackingEnabled.value).toBe(false);
    status.value = 'live';
    await nextTick();
    expect(trackingEnabled.value).toBe(true);
  });
});
