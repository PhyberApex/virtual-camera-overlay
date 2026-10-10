import { ref } from 'vue';

type RuntimeConfig = {
  haToken?: string;
};

const runtimeConfig = ref<RuntimeConfig | null>(null);
let fetchPromise: Promise<RuntimeConfig | null> | null = null;
// Bumped by invalidateRuntimeConfig so a fetch issued before an invalidation
// can't write its (possibly stale) result into the cache after a later,
// post-invalidation fetch has already populated it.
let generation = 0;

const fetchRuntimeConfig = async (): Promise<RuntimeConfig | null> => {
  if (runtimeConfig.value) {
    return runtimeConfig.value;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  const requestGeneration = generation;
  const thisFetch: Promise<RuntimeConfig | null> = fetch('app-config.json', { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Config request failed with status ${response.status}`);
      }
      return (await response.json()) as RuntimeConfig;
    })
    .then(config => {
      if (requestGeneration === generation) {
        runtimeConfig.value = config;
      }
      return config;
    })
    .catch(error => {
      console.warn('[RuntimeConfig] No app-config.json available, falling back to env', error);
      if (requestGeneration === generation) {
        runtimeConfig.value = null;
      }
      return null;
    })
    .finally(() => {
      if (fetchPromise === thisFetch) {
        fetchPromise = null;
      }
    });

  fetchPromise = thisFetch;
  return fetchPromise;
};

export const invalidateRuntimeConfig = (): void => {
  generation += 1;
  runtimeConfig.value = null;
  // Drop any in-flight fetch too, otherwise the next call would await a
  // request that was already issued with the stale, pre-invalidation state.
  fetchPromise = null;
};

export const getHaToken = async (): Promise<string | null> => {
  const config = await fetchRuntimeConfig();
  const envFallback = import.meta.env.VITE_HA_TOKEN as string | undefined;
  return config?.haToken ?? envFallback ?? null;
};
