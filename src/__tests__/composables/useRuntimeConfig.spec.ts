import { describe, it, expect, afterEach, vi } from 'vitest';

const mockFetchResolving = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) });

describe('useRuntimeConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('fetches the config relative to the page, not the site root', async () => {
    const fetchMock = mockFetchResolving({ haToken: 'token' });
    vi.stubGlobal('fetch', fetchMock);

    const { getHaToken } = await import('../../composables/useRuntimeConfig');
    await getHaToken();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith('/')).toBe(false);
  });

  it('re-fetches app-config.json after invalidateRuntimeConfig, instead of reusing the cached token', async () => {
    const fetchMock = mockFetchResolving({ haToken: 'token' });
    vi.stubGlobal('fetch', fetchMock);

    const { getHaToken, invalidateRuntimeConfig } =
      await import('../../composables/useRuntimeConfig');
    await getHaToken();
    await getHaToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    invalidateRuntimeConfig();
    await getHaToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh fetch after invalidation instead of awaiting an already in-flight one', async () => {
    let resolveFirstFetch: ((value: unknown) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstFetch = resolve;
          })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ haToken: 'token-2' }),
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getHaToken, invalidateRuntimeConfig } =
      await import('../../composables/useRuntimeConfig');
    const firstTokenRequest = getHaToken();

    invalidateRuntimeConfig();
    const secondToken = await getHaToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(secondToken).toBe('token-2');

    resolveFirstFetch?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ haToken: 'token-1' }),
    });
    await firstTokenRequest;

    // The abandoned fetch resolving after the fresh one must not clobber the
    // cache with stale data.
    const thirdToken = await getHaToken();
    expect(thirdToken).toBe('token-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
