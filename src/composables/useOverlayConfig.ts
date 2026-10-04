import { ref, type Ref } from 'vue';

type OverlayConfig = {
  maxHeartRate?: unknown;
};

export const DEFAULT_MAX_HEART_RATE = 185;

const maxHeartRate: Ref<number> = ref(DEFAULT_MAX_HEART_RATE);
let fetchPromise: Promise<void> | null = null;

const loadOverlayConfig = (): Promise<void> => {
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetch('overlay-config.json', { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Overlay config request failed with status ${response.status}`);
      }
      return (await response.json()) as OverlayConfig;
    })
    .then(config => {
      if (typeof config.maxHeartRate === 'number') {
        maxHeartRate.value = config.maxHeartRate;
      }
    })
    .catch(error => {
      console.warn('[OverlayConfig] No overlay-config.json available, using defaults', error);
    });

  return fetchPromise;
};

export const useOverlayConfig = (): { maxHeartRate: Ref<number> } => {
  void loadOverlayConfig();
  return { maxHeartRate };
};
