import { describe, it, expect, afterEach, vi } from 'vitest';

const validEntities = {
  steps: 'sensor.ksmb_v1_7aed_current_step_count',
  distance: 'sensor.ksmb_v1_7aed_current_distance',
  speed: 'number.ksmb_v1_7aed_speed_level',
  heartRate: 'sensor.galaxy_watch5_rrry_heart_rate',
  brbToggle: 'input_boolean.janis_vco_brb',
  heartToggle: 'input_boolean.janis_vco_heart',
  compactToggle: 'input_boolean.janis_vco_compact',
};

const validStepsWidget = {
  id: 'steps-display',
  type: 'steps',
  anchor: 'bottom-right',
  offset: { x: 30, y: 30 },
  size: { width: 240, height: 190 },
};

const validConfig = {
  maxHeartRate: 185,
  entities: validEntities,
  widgets: [validStepsWidget],
};

const mockFetchResolving = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) });

const omit = <T extends Record<string, unknown>>(obj: T, key: keyof T): Partial<T> => {
  const clone = { ...obj };
  delete clone[key];
  return clone;
};

describe('useOverlayConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe('a fully valid config', () => {
    it('populates entities, widgets and maxHeartRate', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(validConfig));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { entities, widgets, maxHeartRate } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(widgets.value).toEqual([validStepsWidget]);
      expect(maxHeartRate.value).toBe(185);
    });

    it('resolves ensureOverlayConfigLoaded to true', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(validConfig));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded } = useOverlayConfig();

      await expect(ensureOverlayConfigLoaded()).resolves.toBe(true);
    });

    it('defaults maxHeartRate to 185 when the field is absent but entities/widgets are valid', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(omit(validConfig, 'maxHeartRate')));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { maxHeartRate, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(maxHeartRate.value).toBe(185);
    });

    it('ignores a non-numeric maxHeartRate and falls back to 185', async () => {
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, maxHeartRate: '200' }));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { maxHeartRate, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(maxHeartRate.value).toBe(185);
    });

    it('defaults heartRateLayout to top-left, {x: 20, y: 20} when the field is absent', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(validConfig));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { heartRateLayout, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(heartRateLayout.value).toEqual({ anchor: 'top-left', offset: { x: 20, y: 20 } });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('heartRate');
      warnSpy.mockRestore();
    });

    it('uses a valid heartRate block and logs no warning', async () => {
      const heartRate = { anchor: 'bottom-right', offset: { x: 40, y: 10 } };
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, heartRate }));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { heartRateLayout, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(heartRateLayout.value).toEqual(heartRate);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('falls back to the default heartRateLayout and warns once when heartRate fails shape validation', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchResolving({ ...validConfig, heartRate: { anchor: 'center', offset: { x: 1 } } })
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { heartRateLayout, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(heartRateLayout.value).toEqual({ anchor: 'top-left', offset: { x: 20, y: 20 } });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it('accepts a steps widget with a valid compactSize', async () => {
      const compactStepsWidget = { ...validStepsWidget, compactSize: { width: 500, height: 60 } };
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, widgets: [compactStepsWidget] }));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { widgets, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(widgets.value).toEqual([compactStepsWidget]);
    });

    it('accepts temperature and sensor widgets with per-type props, with no code change required', async () => {
      const widgets = [
        validStepsWidget,
        {
          id: 'office-temp',
          type: 'temperature',
          anchor: 'top-left',
          offset: { x: 10, y: 10 },
          size: { width: 150, height: 100 },
          props: { entityId: 'sensor.office_temperature', unit: '°C' },
        },
        {
          id: 'custom-sensor',
          type: 'sensor',
          anchor: 'top-right',
          offset: { x: 10, y: 10 },
          size: { width: 150, height: 100 },
          props: { entityId: 'sensor.custom', displayName: 'Custom' },
        },
      ];
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, widgets }));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { widgets: loadedWidgets, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(loadedWidgets.value).toEqual(widgets);
    });
  });

  describe('an invalid or unreachable config renders nothing', () => {
    const expectInvalid = async () => {
      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { entities, widgets, ensureOverlayConfigLoaded } = useOverlayConfig();

      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(entities.value).toBeNull();
      expect(widgets.value).toEqual([]);
    };

    it('when the request fails (404)', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(null, false));
      await expectInvalid();
    });

    it('when fetch rejects with a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
      await expectInvalid();
    });

    it('when the response body is not valid JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('invalid json')),
        })
      );
      await expectInvalid();
    });

    it('when entities is missing entirely', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(omit(validConfig, 'entities')));
      await expectInvalid();
    });

    it('when entities is missing a required field', async () => {
      const incompleteEntities = omit(validEntities, 'compactToggle');
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, entities: incompleteEntities }));
      await expectInvalid();
    });

    it('when an entity id is the wrong type', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchResolving({ ...validConfig, entities: { ...validEntities, steps: 42 } })
      );
      await expectInvalid();
    });

    it('when widgets is missing entirely', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(omit(validConfig, 'widgets')));
      await expectInvalid();
    });

    it('when a widget is missing a required field', async () => {
      const incompleteWidget = omit(validStepsWidget, 'size');
      vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, widgets: [incompleteWidget] }));
      await expectInvalid();
    });

    it('when a widget has an unknown type', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchResolving({ ...validConfig, widgets: [{ ...validStepsWidget, type: 'clock' }] })
      );
      await expectInvalid();
    });

    it('when a steps widget has a malformed compactSize', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchResolving({
          ...validConfig,
          widgets: [{ ...validStepsWidget, compactSize: { width: '500', height: 60 } }],
        })
      );
      await expectInvalid();
    });

    it('when a widget has an unknown anchor', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchResolving({
          ...validConfig,
          widgets: [{ ...validStepsWidget, anchor: 'center' }],
        })
      );
      await expectInvalid();
    });

    it('logs exactly one console.error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal('fetch', mockFetchResolving(null, false));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded } = useOverlayConfig();
      await ensureOverlayConfigLoaded();
      await ensureOverlayConfigLoaded();
      useOverlayConfig();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it('throws no unhandled exception', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      await expect(useOverlayConfig().ensureOverlayConfigLoaded()).resolves.toBe(false);
    });
  });

  it('fetches the config relative to the page, not the site root', async () => {
    const fetchMock = mockFetchResolving(validConfig);
    vi.stubGlobal('fetch', fetchMock);

    const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
    useOverlayConfig();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith('/')).toBe(false);
  });
});
