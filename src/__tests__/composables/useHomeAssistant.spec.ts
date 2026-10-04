import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { useHomeAssistant } from '../../composables/useHomeAssistant.js';

// Mock the WebSocket
class MockWebSocket {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  constructor() {
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
  }

  send() {}
  close() {}
}

// Mock environment
vi.stubGlobal('WebSocket', MockWebSocket);

// Mock environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
      VITE_HA_TOKEN: 'test-token',
      VITE_HA_DEV_HOST: 'test-host',
      VITE_HA_PORT: 'test-port',
    },
  },
});

describe('useHomeAssistant', () => {
  let homeAssistant: ReturnType<typeof useHomeAssistant>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Reset all mocks
    vi.clearAllMocks();
    // Create a new instance
    homeAssistant = useHomeAssistant();
  });

  it('should initialize with default values', () => {
    expect(homeAssistant.steps.value).toBe(0);
    expect(homeAssistant.speed.value).toBe(0);
    expect(homeAssistant.connectionState.value).toBe('disconnected');
    expect(homeAssistant.brbEnabled.value).toBe(false);
  });

  it('has no fake initial heart rate value before any message arrives', () => {
    expect(homeAssistant.heartRate.value).toBeFalsy();
  });

  it('hides mock functions on default', () => {
    expect(homeAssistant.startMockStepData).toBe(undefined);
    expect(homeAssistant.stopMockStepData).toBe(undefined);
    expect(homeAssistant.setConnectionState).toBe(undefined);
    expect(homeAssistant.setBrbEnabled).toBe(undefined);
  });

  it('returns mock functions if called from dev panel', () => {
    homeAssistant = useHomeAssistant(true);
    expect(typeof homeAssistant.startMockStepData).toBe('function');
    expect(typeof homeAssistant.stopMockStepData).toBe('function');
    expect(typeof homeAssistant.setConnectionState).toBe('function');
    expect(typeof homeAssistant.setBrbEnabled).toBe('function');
  });

  it('should generate mock data when started', () => {
    homeAssistant = useHomeAssistant(true);
    if (homeAssistant.startMockStepData) homeAssistant.startMockStepData();
    // Wait for the first interval to execute
    vi.advanceTimersByTime(1000);

    // Mock data should have updated the values
    expect(homeAssistant.steps.value).toBeGreaterThan(0);
    expect(homeAssistant.speed.value).toBeGreaterThan(0);
  });

  it('exposes setCompactEnabled only from the dev panel', () => {
    expect(homeAssistant.setCompactEnabled).toBe(undefined);
    homeAssistant = useHomeAssistant(true);
    expect(typeof homeAssistant.setCompactEnabled).toBe('function');
  });
});

class SyncMockWebSocket {
  static instances: SyncMockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    SyncMockWebSocket.instances.push(this);
  }
  send() {}
  close() {}
}

const mountFresh = async (
  isDevPanel: boolean = false
): Promise<{
  result: ReturnType<typeof import('../../composables/useHomeAssistant.js').useHomeAssistant>;
  socket: SyncMockWebSocket;
}> => {
  vi.resetModules();
  SyncMockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', SyncMockWebSocket);
  vi.stubEnv('VITE_HA_DEV_HOST', 'sync-test-host');
  vi.stubEnv('VITE_HA_DEV_PORT', '8123');

  const { useHomeAssistant: freshUseHomeAssistant } =
    await import('../../composables/useHomeAssistant.js');

  let result: ReturnType<typeof freshUseHomeAssistant>;
  const TestComponent = defineComponent({
    setup() {
      result = freshUseHomeAssistant(isDevPanel);
      return () => null;
    },
  });
  mount(TestComponent);

  const socket = SyncMockWebSocket.instances[0];
  expect(socket).toBeDefined();

  return { result: result!, socket: socket! };
};

describe('useHomeAssistant - compactEnabled entity sync', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true when the initial state payload has the entity on, and follows change events', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { a: { 'input_boolean.janis_vco_compact': { s: 'on' } } },
      }),
    });
    expect(result.compactEnabled.value).toBe(true);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { c: { 'input_boolean.janis_vco_compact': { '+': { s: 'off' } } } },
      }),
    });
    expect(result.compactEnabled.value).toBe(false);
  });
});

describe('useHomeAssistant - multi-entity and non-numeric event handling', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('applies every entity present in a single multi-entity c event', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: {
          c: {
            'sensor.ksmb_v1_7aed_current_step_count': { '+': { s: 2000 } },
            'sensor.galaxy_watch5_rrry_heart_rate': { '+': { s: 88 } },
          },
        },
      }),
    });

    expect(result.steps.value).toBe(2000);
    expect(result.heartRate.value).toBe(88);
  });

  it('leaves brbEnabled and heartEnabled unchanged when an a snapshot omits them', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: {
          a: {
            'input_boolean.janis_vco_brb': { s: 'on' },
            'input_boolean.janis_vco_heart': { s: 'on' },
          },
        },
      }),
    });
    expect(result.brbEnabled.value).toBe(true);
    expect(result.heartEnabled.value).toBe(true);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: {
          a: {
            'sensor.ksmb_v1_7aed_current_step_count': { s: 500 },
          },
        },
      }),
    });

    expect(result.brbEnabled.value).toBe(true);
    expect(result.heartEnabled.value).toBe(true);
  });

  it('discards a non-numeric, non-unavailable state in a c event instead of writing NaN', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: {
          c: {
            'sensor.ksmb_v1_7aed_current_step_count': { '+': { s: 1000 } },
          },
        },
      }),
    });
    expect(result.steps.value).toBe(1000);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: {
          c: {
            'sensor.ksmb_v1_7aed_current_step_count': { '+': { s: 'garbage' } },
          },
        },
      }),
    });

    expect(result.steps.value).toBe(1000);
  });
});

describe('useHomeAssistant - unavailable/unknown clears stale data immediately', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clears heartRate to empty when a snapshot reports unavailable', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { a: { 'sensor.galaxy_watch5_rrry_heart_rate': { s: 88 } } },
      }),
    });
    expect(result.heartRate.value).toBe(88);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { a: { 'sensor.galaxy_watch5_rrry_heart_rate': { s: 'unavailable' } } },
      }),
    });
    expect(result.heartRate.value).toBeFalsy();
  });

  it('clears heartRate to empty when a change event reports unknown', async () => {
    const { result, socket } = await mountFresh();

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { c: { 'sensor.galaxy_watch5_rrry_heart_rate': { '+': { s: 88 } } } },
      }),
    });
    expect(result.heartRate.value).toBe(88);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { c: { 'sensor.galaxy_watch5_rrry_heart_rate': { '+': { s: 'unknown' } } } },
      }),
    });
    expect(result.heartRate.value).toBeFalsy();
  });

  it.each([
    ['sensor.ksmb_v1_7aed_current_step_count', 'steps'],
    ['sensor.ksmb_v1_7aed_current_distance', 'distance'],
    ['number.ksmb_v1_7aed_speed_level', 'speed'],
  ] as const)(
    'clears %s to zero when a snapshot reports unavailable or unknown',
    async (entityId, key) => {
      const { result, socket } = await mountFresh();

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { a: { [entityId]: { s: 42 } } },
        }),
      });
      expect(result[key].value).toBe(42);

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { a: { [entityId]: { s: 'unavailable' } } },
        }),
      });
      expect(result[key].value).toBe(0);

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { a: { [entityId]: { s: 7 } } },
        }),
      });
      expect(result[key].value).toBe(7);

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { a: { [entityId]: { s: 'unknown' } } },
        }),
      });
      expect(result[key].value).toBe(0);
    }
  );

  it.each([
    ['sensor.ksmb_v1_7aed_current_step_count', 'steps'],
    ['sensor.ksmb_v1_7aed_current_distance', 'distance'],
    ['number.ksmb_v1_7aed_speed_level', 'speed'],
  ] as const)(
    'clears %s to zero when a change event reports unavailable or unknown',
    async (entityId, key) => {
      const { result, socket } = await mountFresh();

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { c: { [entityId]: { '+': { s: 42 } } } },
        }),
      });
      expect(result[key].value).toBe(42);

      socket.onmessage!({
        data: JSON.stringify({
          type: 'event',
          event: { c: { [entityId]: { '+': { s: 'unavailable' } } } },
        }),
      });
      expect(result[key].value).toBe(0);
    }
  );
});

describe('useHomeAssistant - connection loss grace period', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('never hides the widgets when connection returns to connected within 10 seconds', async () => {
    vi.useFakeTimers();
    const { result } = await mountFresh(true);

    result.setConnectionState!('connected');
    expect(result.connectionLost.value).toBe(false);

    result.setConnectionState!('disconnected');
    vi.advanceTimersByTime(9_000);
    result.setConnectionState!('connected');
    vi.advanceTimersByTime(5_000);

    expect(result.connectionLost.value).toBe(false);
  });

  it('hides the widgets once connectionState is non-connected for a full 10 continuous seconds', async () => {
    vi.useFakeTimers();
    const { result } = await mountFresh(true);

    result.setConnectionState!('connected');
    result.setConnectionState!('disconnected');
    vi.advanceTimersByTime(10_000);

    expect(result.connectionLost.value).toBe(true);
  });

  it('keeps the widgets hidden through reconnection, only clearing once the next snapshot arrives', async () => {
    vi.useFakeTimers();
    const { result, socket } = await mountFresh(true);

    result.setConnectionState!('connected');
    result.setConnectionState!('disconnected');
    vi.advanceTimersByTime(10_000);
    expect(result.connectionLost.value).toBe(true);

    result.setConnectionState!('connected');
    expect(result.connectionLost.value).toBe(true);

    socket.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { a: { 'sensor.galaxy_watch5_rrry_heart_rate': { s: 70 } } },
      }),
    });
    expect(result.connectionLost.value).toBe(false);
  });

  it('clears connectionLost when dev-panel mock data generation is started', async () => {
    vi.useFakeTimers();
    const { result } = await mountFresh(true);

    result.setConnectionState!('connected');
    result.setConnectionState!('disconnected');
    vi.advanceTimersByTime(10_000);
    expect(result.connectionLost.value).toBe(true);

    result.startMockStepData!();
    expect(result.connectionLost.value).toBe(false);
  });
});
