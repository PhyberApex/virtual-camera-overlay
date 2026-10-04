import { describe, it, expect, afterEach, vi } from 'vitest';

describe('useOverlayConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('defaults maxHeartRate to 185 when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await vi.waitFor(() => expect(maxHeartRate.value).toBe(185));
  });

  it('defaults maxHeartRate to 185 when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await vi.waitFor(() => expect(maxHeartRate.value).toBe(185));
  });

  it('defaults maxHeartRate to 185 when the response body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('invalid json')),
      })
    );

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await vi.waitFor(() => expect(maxHeartRate.value).toBe(185));
  });

  it('defaults maxHeartRate to 185 when the field is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    );

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(maxHeartRate.value).toBe(185);
  });

  it('defaults maxHeartRate to 185 when the field is not a number', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ maxHeartRate: '200' }) })
    );

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(maxHeartRate.value).toBe(185);
  });

  it('uses the numeric maxHeartRate from the config once fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ maxHeartRate: 200 }) })
    );

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    const { maxHeartRate } = useOverlayConfig();
    await vi.waitFor(() => expect(maxHeartRate.value).toBe(200));
  });

  it('fetches the config relative to the page, not the site root', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    useOverlayConfig();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith('/')).toBe(false);
  });
});
