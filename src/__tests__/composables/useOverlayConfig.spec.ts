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

    it('defaults heartRateLayout to top-left, {x: 20, y: 20} silently when the field is absent', async () => {
      vi.stubGlobal('fetch', mockFetchResolving(validConfig));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { heartRateLayout, entities } = useOverlayConfig();

      await vi.waitFor(() => expect(entities.value).toEqual(validEntities));
      expect(heartRateLayout.value).toEqual({ anchor: 'top-left', offset: { x: 20, y: 20 } });
      expect(warnSpy).not.toHaveBeenCalled();
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

    describe('camera', () => {
      const load = async (camera?: unknown) => {
        vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, camera }));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
        const result = useOverlayConfig();
        await vi.waitFor(() => expect(result.entities.value).toEqual(validEntities));
        return { ...result, warnSpy };
      };

      it('is not mirrored, silently, when the section is absent', async () => {
        const { camera, warnSpy } = await load();
        expect(camera.value).toEqual({ mirror: false });
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('mirrors when camera.mirror is true', async () => {
        const { camera, warnSpy } = await load({ mirror: true });
        expect(camera.value.mirror).toBe(true);
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it.each([['yes'], [1]])('warns once and falls back for mirror %j', async bad => {
        const { camera, warnSpy } = await load({ mirror: bad });
        expect(camera.value.mirror).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });

      it('warns once and falls back for a non-object section', async () => {
        const { camera, warnSpy } = await load('mirror');
        expect(camera.value.mirror).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('beRightBack', () => {
      const load = async (beRightBack?: unknown) => {
        vi.stubGlobal('fetch', mockFetchResolving({ ...validConfig, beRightBack }));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
        const result = useOverlayConfig();
        await vi.waitFor(() => expect(result.entities.value).toEqual(validEntities));
        return { ...result, warnSpy };
      };

      it("uses today's copy and images silently when absent", async () => {
        const { beRightBack, warnSpy } = await load();
        expect(beRightBack.value.title).toBe('Be Right Back');
        expect(beRightBack.value.subtitle).toBe("I'll be back in a moment!");
        expect(beRightBack.value.particles).toHaveLength(5);
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it('uses configured title, subtitle and particles, including an empty list', async () => {
        const { beRightBack, warnSpy } = await load({
          title: 'BRB',
          subtitle: 'Hi',
          particles: [],
        });
        expect(beRightBack.value).toEqual({ title: 'BRB', subtitle: 'Hi', particles: [] });
        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it('warns once for each invalid field and falls back for that field only', async () => {
        const { beRightBack, warnSpy } = await load({
          title: 'BRB',
          subtitle: 42,
          particles: ['a.png', ''],
        });
        expect(beRightBack.value.title).toBe('BRB');
        expect(beRightBack.value.subtitle).toBe("I'll be back in a moment!");
        expect(beRightBack.value.particles).toHaveLength(5);
        expect(warnSpy).toHaveBeenCalledTimes(2);
        warnSpy.mockRestore();
      });

      it('warns once and uses defaults when the block is not an object', async () => {
        const { beRightBack, warnSpy } = await load('nope');
        expect(beRightBack.value.title).toBe('Be Right Back');
        expect(warnSpy).toHaveBeenCalledTimes(1);
        warnSpy.mockRestore();
      });
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

  describe('semantic validation', () => {
    const load = async (config: unknown) => {
      vi.stubGlobal('fetch', mockFetchResolving(config));
      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      return useOverlayConfig();
    };
    const withWidgets = (widgets: unknown[]) => ({ ...validConfig, widgets });

    it('rejects duplicate widget ids', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { ensureOverlayConfigLoaded } = await load(
        withWidgets([validStepsWidget, { ...validStepsWidget }])
      );
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(error).toHaveBeenCalledTimes(1);
      expect(String(error.mock.calls[0]?.[1])).toContain('widgets[1].id');
      error.mockRestore();
    });

    it.each([
      { width: 0, height: 10 },
      { width: -5, height: 10 },
      { width: 10, height: -1 },
    ])('rejects non-positive size %j', async size => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { ensureOverlayConfigLoaded } = await load(
        withWidgets([{ ...validStepsWidget, size }])
      );
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(error).toHaveBeenCalledTimes(1);
      error.mockRestore();
    });

    it('rejects non-positive compactSize', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { ensureOverlayConfigLoaded } = await load(
        withWidgets([{ ...validStepsWidget, compactSize: { width: 0, height: 5 } }])
      );
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(error).toHaveBeenCalledTimes(1);
      expect(String(error.mock.calls[0]?.[1])).toContain('compactSize');
      error.mockRestore();
    });

    it('rejects a sensor widget without entityId', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { ensureOverlayConfigLoaded } = await load(
        withWidgets([{ ...validStepsWidget, id: 'temp', type: 'sensor' }])
      );
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(error).toHaveBeenCalledTimes(1);
      expect(String(error.mock.calls[0]?.[1])).toContain('widgets[0].props.entityId');
      error.mockRestore();
    });

    it('accepts a steps widget without props', async () => {
      const { ensureOverlayConfigLoaded } = await load(validConfig);
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(true);
    });

    it.each([0, -5, Number.POSITIVE_INFINITY])(
      'falls back to 185 for maxHeartRate %d',
      async value => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { ensureOverlayConfigLoaded, maxHeartRate } = await load({
          ...validConfig,
          maxHeartRate: value,
          heartRate: { anchor: 'top-left', offset: { x: 1, y: 1 } },
        });
        await expect(ensureOverlayConfigLoaded()).resolves.toBe(true);
        expect(maxHeartRate.value).toBe(185);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
      }
    );
  });

  describe('the validation error names the first failing path', () => {
    const messageFor = async (config: unknown) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal('fetch', mockFetchResolving(config));
      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      await useOverlayConfig().ensureOverlayConfigLoaded();
      expect(error).toHaveBeenCalledTimes(1);
      const message = String((error.mock.calls[0]?.[1] as Error).message);
      error.mockRestore();
      return message;
    };
    const widgetWith = (patch: Record<string, unknown>) => ({
      ...validConfig,
      widgets: [{ ...validStepsWidget, ...patch }],
    });

    it('names a non-finite size height', async () => {
      const message = await messageFor(widgetWith({ size: { width: 10, height: 'tall' } }));
      expect(message).toContain('widgets[0].size.height: expected a positive finite number');
    });

    it('names a missing entity key', async () => {
      const message = await messageFor({
        ...validConfig,
        entities: omit(validEntities, 'compactToggle'),
      });
      expect(message).toContain('entities.compactToggle: expected a non-empty string');
    });

    it('names widgets when it is not an array', async () => {
      const message = await messageFor({ ...validConfig, widgets: {} });
      expect(message).toContain('widgets: expected an array');
    });

    it('names a bad offset coordinate', async () => {
      const message = await messageFor(widgetWith({ offset: { x: 1, y: null } }));
      expect(message).toContain('widgets[0].offset.y: expected a finite number');
    });

    it('names an unknown anchor', async () => {
      const message = await messageFor(widgetWith({ anchor: 'middle' }));
      expect(message).toContain('widgets[0].anchor: expected one of');
    });

    it('reports only the first failure', async () => {
      const message = await messageFor({
        ...validConfig,
        entities: omit(validEntities, 'steps'),
        widgets: [{}],
      });
      expect(message).toContain('entities.steps');
      expect(message).not.toContain('widgets');
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
      vi.stubGlobal('fetch', mockFetchResolving(omit(validConfig, 'entities')));

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

  describe('an unreachable config is retried', () => {
    it('re-fetches after a 404 and succeeds once the file is valid', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve(null) })
        .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(validConfig) });
      vi.stubGlobal('fetch', fetchMock);

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded, configUnreachable, configLoaded, entities } =
        useOverlayConfig();

      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      expect(configUnreachable.value).toBe(true);
      expect(configLoaded.value).toBe(false);

      await expect(ensureOverlayConfigLoaded()).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(entities.value).toEqual(validEntities);
      expect(configUnreachable.value).toBe(false);
      expect(configLoaded.value).toBe(true);
      warnSpy.mockRestore();
    });

    it('re-fetches after a network rejection', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(validConfig) });
      vi.stubGlobal('fetch', fetchMock);

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded } = useOverlayConfig();

      await expect(ensureOverlayConfigLoaded()).resolves.toBe(false);
      await expect(ensureOverlayConfigLoaded()).resolves.toBe(true);
      warnSpy.mockRestore();
    });

    it('logs a warning, not an error, for an unreachable file', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal('fetch', mockFetchResolving(null, false));

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      await useOverlayConfig().ensureOverlayConfigLoaded();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('does not re-fetch when the body is not valid JSON', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('invalid json')),
      });
      vi.stubGlobal('fetch', fetchMock);

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded, configUnreachable } = useOverlayConfig();
      await ensureOverlayConfigLoaded();
      await ensureOverlayConfigLoaded();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(configUnreachable.value).toBe(false);
      errorSpy.mockRestore();
    });

    it('does not re-fetch an invalid config', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = mockFetchResolving(omit(validConfig, 'entities'));
      vi.stubGlobal('fetch', fetchMock);

      const { useOverlayConfig } = await import('../../composables/useOverlayConfig');
      const { ensureOverlayConfigLoaded, configUnreachable } = useOverlayConfig();
      await ensureOverlayConfigLoaded();
      await ensureOverlayConfigLoaded();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(configUnreachable.value).toBe(false);
      errorSpy.mockRestore();
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
