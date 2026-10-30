import { ref, shallowRef, type Ref } from 'vue';

export type CameraStatus = 'acquiring' | 'live' | 'denied' | 'unavailable' | 'ended';
export type VideoSource = 'webcam' | 'sample';

export const CAMERA_RETRY_INTERVAL_MS = 3000;
export const SAMPLE_VIDEO_URL = 'dev-sample.mp4';

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  audio: false,
};

const stream: Ref<MediaStream | null> = shallowRef(null);
const status: Ref<CameraStatus> = ref('acquiring');
const source: Ref<VideoSource> = ref('webcam');
const sampleMissing: Ref<boolean> = ref(false);

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
// Bumped on stop so an in-flight getUserMedia can't revive a stopped camera.
let generation = 0;

const clearRetry = (): void => {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const releaseStream = (): void => {
  stream.value?.getTracks().forEach(track => track.stop());
  stream.value = null;
};

const scheduleRetry = (): void => {
  clearRetry();
  if (!running) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void acquire();
  }, CAMERA_RETRY_INTERVAL_MS);
};

const failureStatus = (error: unknown): CameraStatus => {
  const name = (error as { name?: string } | null)?.name;
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable';
};

const acquire = async (): Promise<void> => {
  if (!running || source.value !== 'webcam') return;
  const myGeneration = generation;
  const devices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  if (!devices?.getUserMedia) {
    status.value = 'unavailable';
    scheduleRetry();
    return;
  }
  try {
    const next = await devices.getUserMedia(CAMERA_CONSTRAINTS);
    if (myGeneration !== generation || !running || source.value !== 'webcam') {
      next.getTracks().forEach(track => track.stop());
      return;
    }
    releaseStream();
    stream.value = next;
    status.value = 'live';
    next.getVideoTracks().forEach(track =>
      track.addEventListener('ended', () => {
        if (stream.value !== next) return;
        releaseStream();
        status.value = 'ended';
        scheduleRetry();
      })
    );
  } catch (error) {
    if (myGeneration !== generation) return;
    status.value = failureStatus(error);
    scheduleRetry();
  }
};

const start = (): void => {
  if (running) return;
  running = true;
  if (source.value === 'webcam') {
    status.value = 'acquiring';
    void acquire();
  }
};

const stop = (): void => {
  running = false;
  generation++;
  clearRetry();
  releaseStream();
};

const setSource = (next: VideoSource): void => {
  if (source.value === next) return;
  source.value = next;
  sampleMissing.value = false;
  if (!running) return;
  generation++;
  clearRetry();
  releaseStream();
  if (next === 'webcam') {
    status.value = 'acquiring';
    void acquire();
  } else {
    status.value = 'live';
  }
};

const setSampleMissing = (missing: boolean): void => {
  sampleMissing.value = missing;
};

export const useCamera = (): {
  stream: Ref<MediaStream | null>;
  status: Ref<CameraStatus>;
  source: Ref<VideoSource>;
  sampleMissing: Ref<boolean>;
  start: () => void;
  stop: () => void;
  setSource: (next: VideoSource) => void;
  setSampleMissing: (missing: boolean) => void;
} => ({ stream, status, source, sampleMissing, start, stop, setSource, setSampleMissing });
