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
    expect(homeAssistant.isActive.value).toBe(false);
    expect(homeAssistant.connectionState.value).toBe('disconnected');
    expect(homeAssistant.useMockData.value).toBe(false);
  });

  it('should generate mock data when enabled', () => {
    homeAssistant.toggleMockData();
    // Wait for the first interval to execute
    vi.advanceTimersByTime(1000);

    // Mock data should have updated the values
    expect(homeAssistant.steps.value).toBeGreaterThan(0);
    expect(homeAssistant.speed.value).toBeGreaterThan(0);
    expect(homeAssistant.isActive.value).toBe(true);
    expect(homeAssistant.connectionState.value).toBe('connected');
  });

  it('should toggle mock data correctly', () => {
    const initialMockState = homeAssistant.useMockData.value;
    homeAssistant.toggleMockData();
    expect(homeAssistant.useMockData.value).toBe(!initialMockState);
  });
});
