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

describe('useHomeAssistant - compactEnabled entity sync', () => {
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

  beforeEach(() => {
    vi.resetModules();
    SyncMockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', SyncMockWebSocket);
    vi.stubEnv('VITE_HA_DEV_HOST', 'sync-test-host');
    vi.stubEnv('VITE_HA_DEV_PORT', '8123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true when the initial state payload has the entity on, and follows change events', async () => {
    const { useHomeAssistant: freshUseHomeAssistant } =
      await import('../../composables/useHomeAssistant.js');

    let result: ReturnType<typeof freshUseHomeAssistant>;
    const TestComponent = defineComponent({
      setup() {
        result = freshUseHomeAssistant();
        return () => null;
      },
    });
    mount(TestComponent);

    const socket = SyncMockWebSocket.instances[0];
    expect(socket).toBeDefined();

    socket!.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { a: { 'input_boolean.janis_vco_compact': { s: 'on' } } },
      }),
    });
    expect(result!.compactEnabled.value).toBe(true);

    socket!.onmessage!({
      data: JSON.stringify({
        type: 'event',
        event: { c: { 'input_boolean.janis_vco_compact': { '+': { s: 'off' } } } },
      }),
    });
    expect(result!.compactEnabled.value).toBe(false);
  });
});
