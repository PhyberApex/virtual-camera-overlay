import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHomeAssistant } from '../../composables/useHomeAssistant';

// Mock the WebSocket
class MockWebSocket {
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
  let homeAssistant;

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
    homeAssistant.startMockStepData();
    // Wait for the first interval to execute
    vi.advanceTimersByTime(1000);

    // Mock data should have updated the values
    expect(homeAssistant.steps.value).toBeGreaterThan(0);
    expect(homeAssistant.speed.value).toBeGreaterThan(0);
  });
});
