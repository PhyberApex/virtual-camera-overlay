import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const makeStream = () => {
  const listeners: Array<() => void> = [];
  const track = {
    stop: vi.fn(),
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
  };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  return {
    stream: stream as unknown as MediaStream,
    track,
    end: () => listeners.forEach(l => l()),
  };
};

const load = async () => {
  vi.resetModules();
  const mod = await import('../../composables/useCamera');
  return mod;
};

describe('useCamera', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('requests 1920x1080 at 30fps and goes live', async () => {
    const s = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(s.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera } = await load();
    const cam = useCamera();
    expect(cam.status.value).toBe('acquiring');
    cam.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: false,
    });
    expect(cam.status.value).toBe('live');
    expect(cam.stream.value).toBe(s.stream);
    cam.stop();
  });

  it('reports denied, then recovers on retry', async () => {
    const s = makeStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
      .mockResolvedValue(s.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera, CAMERA_RETRY_INTERVAL_MS } = await load();
    const cam = useCamera();
    cam.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(cam.status.value).toBe('denied');
    await vi.advanceTimersByTimeAsync(CAMERA_RETRY_INTERVAL_MS);
    expect(cam.status.value).toBe('live');
    cam.stop();
  });

  it('reports unavailable when there is no camera or no mediaDevices, and keeps retrying', async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera, CAMERA_RETRY_INTERVAL_MS } = await load();
    const cam = useCamera();
    cam.start();
    await vi.advanceTimersByTimeAsync(CAMERA_RETRY_INTERVAL_MS * 2);
    expect(cam.status.value).toBe('unavailable');
    expect(getUserMedia).toHaveBeenCalledTimes(3);
    cam.stop();

    vi.stubGlobal('navigator', {});
    const again = await load();
    const cam2 = again.useCamera();
    cam2.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(cam2.status.value).toBe('unavailable');
    cam2.stop();
  });

  it('goes ended when the track ends mid-meeting and recovers on retry', async () => {
    const first = makeStream();
    const second = makeStream();
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValue(second.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera, CAMERA_RETRY_INTERVAL_MS } = await load();
    const cam = useCamera();
    cam.start();
    await vi.advanceTimersByTimeAsync(0);
    first.end();
    expect(cam.status.value).toBe('ended');
    expect(cam.stream.value).toBeNull();
    await vi.advanceTimersByTimeAsync(CAMERA_RETRY_INTERVAL_MS);
    expect(cam.status.value).toBe('live');
    expect(cam.stream.value).toBe(second.stream);
    cam.stop();
  });

  it('stop releases the stream and cancels retries', async () => {
    const s = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(s.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera, CAMERA_RETRY_INTERVAL_MS } = await load();
    const cam = useCamera();
    cam.start();
    await vi.advanceTimersByTimeAsync(0);
    cam.stop();
    expect(s.track.stop).toHaveBeenCalled();
    expect(cam.stream.value).toBeNull();
    await vi.advanceTimersByTimeAsync(CAMERA_RETRY_INTERVAL_MS * 2);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('sample source releases the webcam and switching back reacquires', async () => {
    const s = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(s.stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const { useCamera } = await load();
    const cam = useCamera();
    cam.start();
    await vi.advanceTimersByTimeAsync(0);
    cam.setSource('sample');
    expect(cam.stream.value).toBeNull();
    expect(s.track.stop).toHaveBeenCalled();
    cam.setSource('webcam');
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(cam.status.value).toBe('live');
    cam.stop();
  });
});
