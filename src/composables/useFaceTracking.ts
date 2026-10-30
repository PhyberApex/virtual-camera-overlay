import { onScopeDispose, ref, watch, type Ref } from 'vue';
import type { FaceBox } from '../utils/framing';
import { STAGE_SIZE, type Size2 } from '../utils/widgetLayout';

export const DETECTION_INTERVAL_MS = 1000 / 15;
export const FACE_LOST_HOLD_MS = 1000;
const SMOOTHING = 0.4;

const WASM_BASE_URL = 'mediapipe/wasm';
const MODEL_URL = 'mediapipe/face_landmarker.task';

interface Landmark {
  x: number;
  y: number;
}

/** The slice of the MediaPipe Face Landmarker this app uses. */
export interface FaceDetector {
  detect: (video: HTMLVideoElement, timestampMs: number) => Landmark[] | null;
  close: () => void;
}

// The only place that touches the landmarker. Runtime and model come from the app's own build.
const loadFaceDetector = async (): Promise<FaceDetector> => {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  const landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
  return {
    detect: (video, timestampMs) =>
      landmarker.detectForVideo(video, timestampMs).faceLandmarks[0] ?? null,
    close: () => landmarker.close(),
  };
};

/**
 * Bounds of normalized landmarks in stage coordinates, for a video cover-fitted into the stage
 * (and flipped horizontally when mirrored).
 */
export const landmarksToStageBox = (
  landmarks: Landmark[],
  video: Size2,
  stage: Size2,
  mirror: boolean
): FaceBox => {
  const cover = Math.max(stage.width / video.width, stage.height / video.height);
  const offsetX = (stage.width - video.width * cover) / 2;
  const offsetY = (stage.height - video.height * cover) / 2;
  const xs = landmarks.map(p => p.x * video.width * cover + offsetX);
  const ys = landmarks.map(p => p.y * video.height * cover + offsetY);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    x: mirror ? stage.width - right : left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

const smoothBox = (previous: FaceBox | null, next: FaceBox): FaceBox => {
  if (!previous) return next;
  const mix = (a: number, b: number): number => a + (b - a) * SMOOTHING;
  return {
    x: mix(previous.x, next.x),
    y: mix(previous.y, next.y),
    width: mix(previous.width, next.width),
    height: mix(previous.height, next.height),
  };
};

// Shared so widgets outside the camera layer can follow the face without owning the detector.
const sharedFaceBox: Ref<FaceBox | null> = ref(null);
const sharedTracked = ref(false);

/** The face currently tracked by the camera layer, in stage coordinates. */
export const useTrackedFace = (): { faceBox: Ref<FaceBox | null>; tracked: Ref<boolean> } => ({
  faceBox: sharedFaceBox,
  tracked: sharedTracked,
});

export interface FaceTrackingOptions {
  video: Ref<HTMLVideoElement | null>;
  /** Detection only runs while this is true. */
  enabled: Ref<boolean>;
  mirror: Ref<boolean>;
  stage?: Size2;
  createDetector?: () => Promise<FaceDetector>;
}

/**
 * Samples the video about 15 times a second and exposes a smoothed face box in stage
 * coordinates. `tracked` stays true for one second after the face disappears, with the box
 * held at its last position; after that the box is null.
 */
export const useFaceTracking = ({
  video,
  enabled,
  mirror,
  stage = STAGE_SIZE,
  createDetector = loadFaceDetector,
}: FaceTrackingOptions): { faceBox: Ref<FaceBox | null>; tracked: Ref<boolean> } => {
  const faceBox = sharedFaceBox;
  const tracked = sharedTracked;

  let detector: FaceDetector | null = null;
  let loading = false;
  let loadFailed = false;
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lostSince: number | null = null;

  const markLost = (now: number): void => {
    if (!tracked.value) return;
    lostSince ??= now;
    if (now - lostSince >= FACE_LOST_HOLD_MS) {
      tracked.value = false;
      faceBox.value = null;
      lostSince = null;
    }
  };

  const sample = (): void => {
    const el = video.value;
    const now = performance.now();
    if (!el || !detector || el.readyState < 2 || !el.videoWidth || !el.videoHeight) {
      markLost(now);
      return;
    }
    let landmarks: Landmark[] | null = null;
    try {
      landmarks = detector.detect(el, now);
    } catch (error) {
      console.warn('[FaceTracking] Detection failed', error);
    }
    if (!landmarks?.length) {
      markLost(now);
      return;
    }
    lostSince = null;
    const box = landmarksToStageBox(
      landmarks,
      { width: el.videoWidth, height: el.videoHeight },
      stage,
      mirror.value
    );
    faceBox.value = smoothBox(tracked.value ? faceBox.value : null, box);
    tracked.value = true;
  };

  const ensureDetector = async (): Promise<void> => {
    if (detector || loading || loadFailed) return;
    loading = true;
    try {
      const created = await createDetector();
      if (enabled.value && !disposed) {
        detector = created;
      } else {
        created.close();
      }
    } catch (error) {
      loadFailed = true;
      console.warn('[FaceTracking] Face landmarker unavailable; auto-framing is off', error);
    } finally {
      loading = false;
    }
  };

  const stopTimer = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const reset = (): void => {
    stopTimer();
    lostSince = null;
    tracked.value = false;
    faceBox.value = null;
  };

  watch(
    enabled,
    isEnabled => {
      if (!isEnabled) {
        reset();
        return;
      }
      void ensureDetector();
      timer ??= setInterval(sample, DETECTION_INTERVAL_MS);
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    disposed = true;
    reset();
    detector?.close();
    detector = null;
  });

  return { faceBox, tracked };
};
