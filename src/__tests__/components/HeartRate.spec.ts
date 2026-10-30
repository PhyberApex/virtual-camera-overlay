import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import gsap from 'gsap';
import HeartRate from '../../components/HeartRate.vue';
import type { WidgetAnchor, Vector2 } from '../../utils/widgetLayout';

const heartEnabled = ref(true);
const heartRate = ref(0);
const connectionLost = ref(false);
const maxHeartRate = ref(185);
const heartRateLayout = ref<{ anchor: WidgetAnchor; offset: Vector2 }>({
  anchor: 'top-left',
  offset: { x: 20, y: 20 },
});

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

vi.mock('../../composables/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    heartEnabled,
    heartRate,
    connectionLost,
  }),
}));

const faceBox = ref<{ x: number; y: number; width: number; height: number } | null>(null);
const tracked = ref(false);
vi.mock('../../composables/useFaceTracking', () => ({
  useTrackedFace: () => ({ faceBox, tracked }),
}));

vi.mock('../../composables/useOverlayConfig', () => ({
  useOverlayConfig: () => ({
    maxHeartRate,
    heartRateLayout,
  }),
}));

describe('HeartRate', () => {
  beforeEach(() => {
    heartRateLayout.value = { anchor: 'top-left', offset: { x: 20, y: 20 } };
  });

  it('is not rendered when there is no heart rate reading yet', () => {
    heartEnabled.value = true;
    heartRate.value = 0;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(false);
  });

  it('is rendered once a real reading arrives while enabled and connected', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(true);
    expect(wrapper.find('.bpm-value').text()).toBe('72');
  });

  it('hides when the connection is lost, even though a reading is still held', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = true;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.heart-rate-overlay').exists()).toBe(false);
  });

  it('derives the zone class and name from the configured maxHeartRate', () => {
    heartEnabled.value = true;
    heartRate.value = 150;
    connectionLost.value = false;
    maxHeartRate.value = 200;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').classes()).toContain('zone-exercise');
    expect(wrapper.find('.bpm-zone').text()).toBe('exercise');
  });

  it('positions the BPM display and pulse waves at the fallback top-left, 20/20 by default', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').attributes('style')).toContain('top: 20px');
    expect(wrapper.find('.bpm-display').attributes('style')).toContain('left: 20px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('top: 20px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('left: 20px');
  });

  it('positions the BPM display and pulse waves at the configured anchor and offset', () => {
    heartEnabled.value = true;
    heartRate.value = 72;
    connectionLost.value = false;
    heartRateLayout.value = { anchor: 'bottom-right', offset: { x: 40, y: 10 } };
    const wrapper = mount(HeartRate);

    expect(wrapper.find('.bpm-display').attributes('style')).toContain('bottom: 10px');
    expect(wrapper.find('.bpm-display').attributes('style')).toContain('right: 40px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('bottom: 10px');
    expect(wrapper.find('.pulse-waves').attributes('style')).toContain('right: 40px');
  });

  describe('vignette', () => {
    beforeEach(() => {
      heartEnabled.value = true;
      connectionLost.value = false;
      maxHeartRate.value = 200;
    });

    it('is present while a heart rate is shown, with the zone class', () => {
      heartRate.value = 150;
      const wrapper = mount(HeartRate);
      expect(wrapper.find('.vignette').exists()).toBe(true);
      expect(wrapper.find('.vignette').classes()).toContain('zone-exercise');
      expect(wrapper.find('.screen-border').exists()).toBe(false);
    });

    it('follows the zone as the rate changes', async () => {
      heartRate.value = 60;
      const wrapper = mount(HeartRate);
      heartRate.value = 190;
      await nextTick();
      expect(wrapper.find('.vignette').classes()).toContain('zone-maximum');
    });

    it('is absent without a heart rate', () => {
      heartRate.value = 0;
      expect(mount(HeartRate).find('.vignette').exists()).toBe(false);
    });

    it('is absent when the display is disabled or the connection is lost', () => {
      heartRate.value = 72;
      heartEnabled.value = false;
      expect(mount(HeartRate).find('.vignette').exists()).toBe(false);
      heartEnabled.value = true;
      connectionLost.value = true;
      expect(mount(HeartRate).find('.vignette').exists()).toBe(false);
    });

    it('pulses with a period derived from the BPM', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');
      heartRate.value = 60;
      mount(HeartRate);
      const tl = timelineSpy.mock.results.at(-1)!.value as gsap.core.Timeline;
      // 0.1 + 0.3 + 0.08 + (60/60 - 0.48) = one beat per second
      expect(tl.duration()).toBeCloseTo(1, 5);
      timelineSpy.mockRestore();
      tl.kill();
    });
  });

  describe('face anchoring', () => {
    let toSpy: ReturnType<typeof vi.spyOn>;
    const followCalls = (): Record<string, number>[] =>
      toSpy.mock.calls
        .map((c: unknown[]) => c[1] as Record<string, number>)
        .filter((v: Record<string, number>) => 'x' in v && 'y' in v);

    beforeEach(() => {
      heartEnabled.value = true;
      heartRate.value = 72;
      connectionLost.value = false;
      faceBox.value = null;
      tracked.value = false;
      toSpy = vi.spyOn(gsap, 'to').mockImplementation(() => ({}) as gsap.core.Tween);
    });

    afterEach(() => toSpy.mockRestore());

    it('eases beside the head, right of the face, while tracked', async () => {
      mount(HeartRate);
      faceBox.value = { x: 800, y: 300, width: 200, height: 260 };
      tracked.value = true;
      await nextTick();
      // jsdom measures 0, so the fallback 110x90 widget in a top-left 20/20 corner applies.
      const last = followCalls().at(-1)!;
      expect(last.x).toBe(1024 - 20);
      expect(last.y).toBe(300 + (260 - 90) / 2 - 20);
    });

    it('flips to the left of the head near the right edge of the stage', async () => {
      mount(HeartRate);
      faceBox.value = { x: 1700, y: 300, width: 200, height: 260 };
      tracked.value = true;
      await nextTick();
      expect(followCalls().at(-1)!.x).toBe(1700 - 24 - 110 - 20);
    });

    it('eases back to the configured corner when tracking is lost', async () => {
      mount(HeartRate);
      faceBox.value = { x: 800, y: 300, width: 200, height: 260 };
      tracked.value = true;
      await nextTick();
      tracked.value = false;
      faceBox.value = null;
      await nextTick();
      expect(followCalls().at(-1)).toMatchObject({ x: 0, y: 0 });
    });

    it('stays hidden without a heart rate even while a face is tracked', async () => {
      heartRate.value = 0;
      const wrapper = mount(HeartRate);
      faceBox.value = { x: 800, y: 300, width: 200, height: 260 };
      tracked.value = true;
      await nextTick();
      expect(wrapper.find('.heart-rate-overlay').exists()).toBe(false);
    });
  });
});
