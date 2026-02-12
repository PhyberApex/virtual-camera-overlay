import { ref } from 'vue';

type RuntimeConfig = {
  haToken?: string;
};

const runtimeConfig = ref<RuntimeConfig | null>(null);
let fetchPromise: Promise<RuntimeConfig | null> | null = null;

const fetchRuntimeConfig = async (): Promise<RuntimeConfig | null> => {
  if (runtimeConfig.value) {
    return runtimeConfig.value;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetch('/app-config.json', { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Config request failed with status ${response.status}`);
      }
      return (await response.json()) as RuntimeConfig;
    })
    .then(config => {
      runtimeConfig.value = config;
      return config;
    })
    .catch(error => {
      console.warn('[RuntimeConfig] No app-config.json available, falling back to env', error);
      runtimeConfig.value = null;
      return null;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
};

export const getHaToken = async (): Promise<string | null> => {
  const config = await fetchRuntimeConfig();
  const envFallback = import.meta.env.VITE_HA_TOKEN as string | undefined;
  return config?.haToken ?? envFallback ?? null;
};
