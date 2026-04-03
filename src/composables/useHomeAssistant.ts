import { onMounted, onUnmounted, readonly, ref, type Ref } from 'vue';
import { getHaToken } from './useRuntimeConfig';

// Define types for the state
type ConnectionState = 'disconnected' | 'authenticating' | 'connected';

// Define types for Home Assistant messages
interface HAAuthRequiredMessage {
  type: 'auth_required';
}

interface HAAuthOkMessage {
  type: 'auth_ok';
}

interface HAEventMessage {
  type: 'event';
  event: {
    a?: Record<string, { s: string | number }>;
    c?: Record<string, { '+': { s: string | number } }>;
  };
}

interface HAPongMessage {
  type: 'pong';
}

type HAMessage = HAAuthRequiredMessage | HAAuthOkMessage | HAEventMessage | HAPongMessage;

const steps: Ref<number> = ref(0);
const speed: Ref<number> = ref(0);
const distance: Ref<number> = ref(0);
const connectionState: Ref<ConnectionState> = ref('disconnected');
const brbEnabled: Ref<boolean> = ref(false);
const heartEnabled: Ref<boolean> = ref(false);
const heartRate: Ref<number> = ref(70);
const audioEffectsEnabled: Ref<boolean> = ref(false);

const RECONNECT_BASE_DELAY = 2_000;
const RECONNECT_MAX_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_MISSES_ALLOWED = 2;

let socket: WebSocket | null = null;
let msgId: number = 1;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let missedHeartbeats = 0;
let mockStepDataInterval: number | null = null;
let mockHeartDataInterval: number | null = null;
const devHost: string = import.meta.env.VITE_HA_DEV_HOST as string;
const devPort: string = import.meta.env.VITE_HA_DEV_PORT as string;

const clearTimeoutSafe = (id: number | null): void => {
  if (id !== null) {
    window.clearTimeout(id);
  }
};

const clearIntervalSafe = (id: number | null): void => {
  if (id !== null) {
    window.clearInterval(id);
  }
};

const resetHeartbeat = (): void => {
  clearIntervalSafe(heartbeatTimer);
  heartbeatTimer = null;
  missedHeartbeats = 0;
};

const resetReconnectTimer = (): void => {
  clearTimeoutSafe(reconnectTimer);
  reconnectTimer = null;
};

const scheduleReconnect = (): void => {
  if (reconnectTimer || connectionState.value === 'authenticating') return;
  const delay = Math.min(
    RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
    RECONNECT_MAX_DELAY
  );
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts += 1;
    connectToHA(true);
  }, delay);
};

const startHeartbeat = (): void => {
  resetHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify({ type: 'ping' }));
      missedHeartbeats += 1;
      if (missedHeartbeats > HEARTBEAT_MISSES_ALLOWED) {
        console.warn('[HomeAssistant] Missed heartbeats, forcing reconnect');
        forceReconnect();
      }
    } catch (error) {
      console.error('[HomeAssistant] Failed to send heartbeat', error);
      forceReconnect();
    }
  }, HEARTBEAT_INTERVAL);
};

const forceReconnect = (): void => {
  resetHeartbeat();
  resetReconnectTimer();
  if (socket) {
    socket.close();
    socket = null;
  }
  connectionState.value = 'disconnected';

  scheduleReconnect();
};

const updateAuthenticatedState = (): void => {
  reconnectAttempts = 0;
  missedHeartbeats = 0;
  resetReconnectTimer();
  startHeartbeat();
};

const cleanupSocket = (): void => {
  if (socket) {
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    socket = null;
  }

  resetHeartbeat();
  resetReconnectTimer();
};

const handleConnectionDrop = (): void => {
  console.warn('[HomeAssistant] Connection dropped, scheduling reconnect');
  cleanupSocket();
  connectionState.value = 'disconnected';
  scheduleReconnect();
};

// Generate mock data for development
const startMockStepData = (): void => {
  if (mockStepDataInterval) clearInterval(mockStepDataInterval);

  console.log('Starting mock step data generation');
  // Initial values
  steps.value = 1250;
  speed.value = 3.5;
  connectionState.value = 'connected';

  mockStepDataInterval = window.setInterval(() => {
    // Randomly update steps (increment by 5-15 steps every second)
    steps.value += Math.floor(Math.random() * 10) + 5;

    // Randomly fluctuate speed between 3.0 and 6.0
    speed.value = parseFloat((3 + Math.random() * 3).toFixed(1));

    console.log(`Mock data updated: ${steps.value} steps, ${speed.value} km/h`);
  }, 1000);
};

// Stop mock data generation
const stopMockStepData = (): void => {
  if (mockStepDataInterval) {
    clearInterval(mockStepDataInterval);
    mockStepDataInterval = null;
    console.log('Stopped mock data generation');
  }
};

const startMockHeartData = (): void => {
  if (mockHeartDataInterval) clearInterval(mockHeartDataInterval);

  console.log('Starting mock step data generation');
  // Initial values
  heartRate.value = 65;
  connectionState.value = 'connected';

  mockHeartDataInterval = window.setInterval(() => {
    // Randomly fluctuate heartRate between 60 and 180
    if(heartRate.value > 160)
      heartRate.value = 60
    else
      heartRate.value += Math.floor(Math.random() * 8) + 3

    console.log(`Mock data updated: ${heartRate.value} bpm`);
  }, 2000);
};

// Stop mock data generation
const stopMockHeartData = (): void => {
  if (mockHeartDataInterval) {
    clearInterval(mockHeartDataInterval);
    mockHeartDataInterval = null;
    console.log('Stopped mock data generation');
  }
};

const handleMissingToken = (): void => {
  console.error('[HomeAssistant] Missing Home Assistant token. Aborting connection.');
  connectionState.value = 'disconnected';
  socket?.close();
};

const connectToHA = (isReconnect = false): void => {
  if (socket) return;
  // Use different URLs for development and production
  const isDev: boolean = import.meta.env.DEV as boolean;
  const protocol: string = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host: string = isDev ? devHost : window.location.hostname;
  const port: string = isDev ? devPort : window.location.port;
  const url: string = `${protocol}//${host}:${port}/api/websocket`;

  if (!isReconnect) {
    reconnectAttempts = 0;
  }

  console.log(
    `Connecting to Home Assistant at ${url} (${isDev ? 'development' : 'production'} mode)`
  );
  connectionState.value = 'authenticating';
  socket = new WebSocket(url);

  socket.onopen = (): void => {
    console.log('WebSocket connection established, authenticating...');
  };

  socket.onerror = (error): void => {
    console.error('[HomeAssistant] WebSocket error', error);
    handleConnectionDrop();
  };

  socket.onclose = (): void => {
    handleConnectionDrop();
  };

  socket.onmessage = async (event: MessageEvent): Promise<void> => {
    const message: HAMessage = JSON.parse(event.data);
    console.log('Received message:', message);

    if ((message as { type: string }).type === 'pong') {
      missedHeartbeats = 0;
      return;
    }

    // Handle authentication
    if (message.type === 'auth_required') {
      const accessToken = await getHaToken();
      if (!accessToken) {
        handleMissingToken();
        return;
      }
      socket?.send(
        JSON.stringify({
          type: 'auth',
          access_token: accessToken,
        })
      );
    } else if (message.type === 'auth_ok') {
      updateAuthenticatedState();
      connectionState.value = 'connected';
      console.log('Authentication successful');

      // Subscribe to state changes
      subscribeToEntities();
    }
    // Initial values
    else if (message.type === 'event' && message.event && message.event.a) {
      const eventData = message.event.a;
      const stepsData = eventData['sensor.ksmb_v1_7aed_current_step_count']?.s;
      if (stepsData !== 'unavailable' && typeof stepsData === 'number') {
        steps.value = stepsData;
      }

      const distanceData = eventData['sensor.sensor.ksmb_v1_7aed_current_dist
... (truncated)