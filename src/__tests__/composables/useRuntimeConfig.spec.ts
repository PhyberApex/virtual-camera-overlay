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
});
