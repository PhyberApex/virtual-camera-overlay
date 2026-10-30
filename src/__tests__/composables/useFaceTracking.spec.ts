import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, ref } from 'vue';
import {
  DETECTION_INTERVAL_MS,
  FACE_LOST_HOLD_MS,
  landmarksToStageBox,
  useFaceTracking,
  type FaceDetector,
} from '../../composables/useFaceTracking';

const stage = { width: 1920, height: 1080 };

describe('landmarksToStageBox', () => {
  const landmarks = [
    { x: 0.4, y: 0.2 },
    { x: 0.6, y: 0.5 },
  ];

  it('maps normalized bounds into stage units for a video of the stage aspect', () => {
    const box = landmarksToStageBox(landmarks, { width: 1280, height: 720 }, stage, false);
    expect(box.x).toBeCloseTo(768);
    expect(box.y).toBeCloseTo(216);
    expect(box.width).toBeCloseTo(384);
    expect(box.height).toBeCloseTo(324);
  });

  it('accounts for the crop of a cover-fitted 4:3 video', () => {
    const box = landmarksToStageBox(landmarks, { width: 640, height: 480 }, stage, false);
    // cover = 3, video is 1920x1440 with 180 cropped off the top
    expect(box.y).toBeCloseTo(0.2 * 1440 - 180);
    expect(box.height).toBeCloseTo(0.3 * 1440);
    expect(box.x).toBeCloseTo(768);
  });

  it('flips horizontally when mirrored', () => {
    const box = landmarksToStageBox(landmarks, { width: 1280, height: 720 }, stage, true);
    expect(box.x).toBeCloseTo(1920 - 768 - 384);
  });
});

describe('useFaceTracking', () => {
  let landmarks: Array<{ x: number; y: number }> | null;
  let detector: FaceDetector;
  let scope: ReturnType<typeof effectScope>;
  const enabled = ref(true);

  const mountTracking = () => {
    const video = ref({ readyState: 4, videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement);
    return scope.run(() =>
      useFaceTracking({
        video,
        enabled,
        mirror: ref(false),
        stage,
        createDetector: async () => detector,
      })
    )!;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    enabled.value = true;
    landmarks = [
      { x: 0.4, y: 0.2 },
      { x: 0.5, y: 0.4 },
    ];
    detector = { detect: vi.fn(() => landmarks), close: vi.fn() };
    scope = effectScope();
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
  });

  it('reports a face box once the detector is loaded and a face is seen', async () => {
    const { faceBox, tracked } = mountTracking();
    await vi.advanceTimersByTimeAsync(DETECTION_INTERVAL_MS * 2);
    expect(tracked.value).toBe(true);
    expect(faceBox.value?.width).toBeCloseTo(192);
  });

  it('samples at about 15 fps', async () => {
    mountTracking();
    await vi.advanceTimersByTimeAsync(1000);
    const calls = vi.mocked(detector.detect).mock.calls.length;
    expect(calls).toBeGreaterThanOrEqual(13);
    expect(calls).toBeLessThanOrEqual(15);
  });

  it('holds the box for one second after the face is lost, then clears it', async () => {
    const { faceBox, tracked } = mountTracking();
    await vi.advanceTimersByTimeAsync(DETECTION_INTERVAL_MS * 2);
    const held = faceBox.value;
    landmarks = null;
    await vi.advanceTimersByTimeAsync(FACE_LOST_HOLD_MS / 2);
    expect(tracked.value).toBe(true);
    expect(faceBox.value).toEqual(held);
    await vi.advanceTimersByTimeAsync(FACE_LOST_HOLD_MS);
    expect(tracked.value).toBe(false);
    expect(faceBox.value).toBeNull();
  });

  it('smooths towards a moved face instead of jumping', async () => {
    const { faceBox } = mountTracking();
    await vi.advanceTimersByTimeAsync(DETECTION_INTERVAL_MS * 2);
    const before = faceBox.value!.x;
    landmarks = [
      { x: 0.7, y: 0.2 },
      { x: 0.8, y: 0.4 },
    ];
    await vi.advanceTimersByTimeAsync(DETECTION_INTERVAL_MS);
    const after = faceBox.value!.x;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(0.7 * 1920);
  });

  it('does not detect while disabled', async () => {
    enabled.value = false;
    const { tracked } = mountTracking();
    await vi.advanceTimersByTimeAsync(1000);
    expect(detector.detect).not.toHaveBeenCalled();
    expect(tracked.value).toBe(false);
  });

  it('stays untracked and warns once when the landmarker cannot load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { tracked } = scope.run(() =>
      useFaceTracking({
        video: ref(null),
        enabled,
        mirror: ref(false),
        stage,
        createDetector: () => Promise.reject(new Error('no wasm')),
      })
    )!;
    await vi.advanceTimersByTimeAsync(1000);
    expect(tracked.value).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
