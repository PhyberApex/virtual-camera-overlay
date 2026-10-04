import { onMounted, onUnmounted, readonly, ref, watch, type Ref } from 'vue';
import { getHaToken } from './useRuntimeConfig';
import { useWidgetManager } from './useWidgetManager';

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
const compactEnabled: Ref<boolean> = ref(false);
const heartRate: Ref<number> = ref(0);
const entityStates: Ref<Record<string, string | number>> = ref({});
const connectionLost: Ref<boolean> = ref(false);

const RECONNECT_BASE_DELAY = 2_000;
const RECONNECT_MAX_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_MISSES_ALLOWED = 2;
const CONNECTION_LOSS_GRACE_PERIOD = 10_000;

let socket: WebSocket | null = null;
let msgId: number = 1;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let missedHeartbeats = 0;
let connectionLossTimer: number | null = null;
let mockStepDataInterval: number | null = null;
let mockHeartDataInterval: number | null = null;
const devHost: string = import.meta.env.VITE_HA_DEV_HOST as string;
const devPort: string = import.meta.env.VITE_HA_DEV_PORT as string;

const parseFiniteFloat = (state: string | number | undefined): number | undefined => {
  const parsed =
    typeof state === 'number' ? state : typeof state === 'string' ? parseFloat(state) : undefined;
  return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
};

const isUnavailableState = (state: string | number | undefined): boolean =>
  state === 'unavailable' || state === 'unknown';

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

const clearConnectionLossTimer = (): void => {
  clearTimeoutSafe(connectionLossTimer);
  connectionLossTimer = null;
};

watch(
  connectionState,
  newState => {
    if (newState === 'connected') {
      clearConnectionLossTimer();
      return;
    }
    if (connectionLossTimer === null) {
      connectionLossTimer = window.setTimeout(() => {
        connectionLossTimer = null;
        connectionLost.value = true;
      }, CONNECTION_LOSS_GRACE_PERIOD);
    }
  },
  { flush: 'sync' }
);

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
  distance.value = 850;
  connectionState.value = 'connected';

  mockStepDataInterval = window.setInterval(() => {
    // Randomly update steps (increment by 5-15 steps every second)
    steps.value += Math.floor(Math.random() * 10) + 5;

    // Randomly fluctuate speed between 3.0 and 6.0
    speed.value = parseFloat((3 + Math.random() * 3).toFixed(1));

    // Update distance based on speed (rough calculation: speed in m/s * 1 second)
    distance.value += parseFloat(((speed.value * 1000) / 3600).toFixed(1));

    console.log(`Mock data updated: ${steps.value} steps, ${speed.value} km/h, ${distance.value}m`);
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

  console.log('Starting mock heart data generation');
  // Initial values
  heartRate.value = 65;
  connectionState.value = 'connected';

  mockHeartDataInterval = window.setInterval(() => {
    // Randomly fluctuate heartRate between 60 and 180
    if (heartRate.value > 160) heartRate.value = 60;
    else heartRate.value += Math.floor(Math.random() * 8) + 3;

    console.log(`Mock data updated: ${heartRate.value} bpm`);
  }, 2000);
};

const stopMockHeartData = (): void => {
  if (mockHeartDataInterval) {
    clearInterval(mockHeartDataInterval);
    mockHeartDataInterval = null;
    console.log('Stopped mock heart data generation');
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

  // Check if host/port are valid
  if (!host || !port || host.includes('your_') || port.includes('your_')) {
    console.warn('[HomeAssistant] Invalid or missing HA connection config, skipping connection');
    connectionState.value = 'disconnected';
    return;
  }

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
    // Initial state snapshot
    else if (message.type === 'event' && message.event && message.event.a) {
      const eventData = message.event.a;
      clearConnectionLossTimer();
      connectionLost.value = false;

      for (const [entityId, state] of Object.entries(eventData)) {
        if (state.s !== 'unavailable') {
          entityStates.value[entityId] = state.s;
        }
      }

      const stepsData = eventData['sensor.ksmb_v1_7aed_current_step_count']?.s;
      if (isUnavailableState(stepsData)) {
        steps.value = 0;
      } else if (typeof stepsData === 'number') {
        steps.value = stepsData;
      }

      const distanceData = eventData['sensor.ksmb_v1_7aed_current_distance']?.s;
      if (isUnavailableState(distanceData)) {
        distance.value = 0;
      } else if (typeof distanceData === 'number') {
        distance.value = distanceData;
      }

      const speedData = eventData['number.ksmb_v1_7aed_speed_level']?.s;
      if (isUnavailableState(speedData)) {
        speed.value = 0;
      } else if (typeof speedData === 'number') {
        speed.value = speedData;
      }
      const heartData = eventData['sensor.galaxy_watch5_rrry_heart_rate']?.s;
      if (isUnavailableState(heartData)) {
        heartRate.value = 0;
      } else if (typeof heartData === 'number') {
        heartRate.value = heartData;
      }

      if ('input_boolean.janis_vco_brb' in eventData) {
        brbEnabled.value = eventData['input_boolean.janis_vco_brb']?.s === 'on';
      }
      if ('input_boolean.janis_vco_heart' in eventData) {
        heartEnabled.value = eventData['input_boolean.janis_vco_heart']?.s === 'on';
      }
      compactEnabled.value = eventData['input_boolean.janis_vco_compact']?.s === 'on';
    } else if (message.type === 'event' && message.event && message.event.c) {
      const eventData = message.event.c;

      for (const [entityId, diff] of Object.entries(eventData)) {
        const newState = diff['+']?.s;
        if (newState !== undefined) {
          entityStates.value[entityId] = newState;
        }
      }

      const stepsDiff = eventData['sensor.ksmb_v1_7aed_current_step_count'];
      if (stepsDiff) {
        const newSteps = stepsDiff['+']?.s;
        if (isUnavailableState(newSteps)) {
          steps.value = 0;
        } else if (typeof newSteps === 'number' || typeof newSteps === 'string') {
          const parsed = parseInt(String(newSteps), 10);
          if (Number.isFinite(parsed)) {
            steps.value = parsed;
          }
        }
      }

      const distanceDiff = eventData['sensor.ksmb_v1_7aed_current_distance'];
      if (distanceDiff) {
        const newDistance = distanceDiff['+']?.s;
        if (isUnavailableState(newDistance)) {
          distance.value = 0;
        } else {
          const parsed = parseFiniteFloat(newDistance);
          if (parsed !== undefined) {
            distance.value = parsed;
          }
        }
      }

      const speedDiff = eventData['number.ksmb_v1_7aed_speed_level'];
      if (speedDiff) {
        const newSpeed = speedDiff['+']?.s;
        if (isUnavailableState(newSpeed)) {
          speed.value = 0;
        } else {
          const parsed = parseFiniteFloat(newSpeed);
          if (parsed !== undefined) {
            speed.value = parsed;
          }
        }
      }

      if (eventData['input_boolean.janis_vco_brb']) {
        brbEnabled.value = eventData['input_boolean.janis_vco_brb']['+']?.s === 'on';
      }
      if (eventData['input_boolean.janis_vco_heart']) {
        heartEnabled.value = eventData['input_boolean.janis_vco_heart']['+']?.s === 'on';
      }
      if (eventData['input_boolean.janis_vco_compact']) {
        compactEnabled.value = eventData['input_boolean.janis_vco_compact']['+']?.s === 'on';
      }

      const heartRateDiff = eventData['sensor.galaxy_watch5_rrry_heart_rate'];
      if (heartRateDiff) {
        const newHeartRate = heartRateDiff['+']?.s;
        if (isUnavailableState(newHeartRate)) {
          heartRate.value = 0;
        } else {
          const parsed = parseFiniteFloat(newHeartRate);
          if (parsed !== undefined) {
            heartRate.value = parsed;
          }
        }
      }
    }
  };
};

const subscribeToEntities = (): void => {
  const { widgets } = useWidgetManager();
  const widgetEntityIds = widgets.value
    .map(w => w.props?.entityId as string | undefined)
    .filter((id): id is string => !!id);

  const entities: string[] = [
    ...new Set([
      'sensor.ksmb_v1_7aed_current_step_count',
      'sensor.ksmb_v1_7aed_current_distance',
      'number.ksmb_v1_7aed_speed_level',
      'input_boolean.janis_vco_brb',
      'sensor.galaxy_watch5_rrry_heart_rate',
      'input_boolean.janis_vco_heart',
      'input_boolean.janis_vco_compact',
      ...widgetEntityIds,
    ]),
  ];

  socket?.send(
    JSON.stringify({
      id: msgId++,
      type: 'subscribe_entities',
      entity_ids: entities,
    })
  );
};

const setConnectionState = (state: ConnectionState): void => {
  connectionState.value = state;
};

const setBrbEnabled = (enabled: boolean): void => {
  brbEnabled.value = enabled;
};

const setHeartEnabled = (enabled: boolean): void => {
  heartEnabled.value = enabled;
};

const setCompactEnabled = (enabled: boolean): void => {
  compactEnabled.value = enabled;
};

const getEntityState = (entityId: string): string | number | undefined =>
  entityStates.value[entityId];

interface HomeAssistantReturn {
  steps: Readonly<Ref<number>>;
  distance: Readonly<Ref<number>>;
  speed: Readonly<Ref<number>>;
  connectionState: Readonly<Ref<ConnectionState>>;
  brbEnabled: Readonly<Ref<boolean>>;
  heartEnabled: Readonly<Ref<boolean>>;
  compactEnabled: Readonly<Ref<boolean>>;
  heartRate: Readonly<Ref<number>>;
  connectionLost: Readonly<Ref<boolean>>;
  getEntityState: (entityId: string) => string | number | undefined;
  startMockStepData?: () => void;
  stopMockStepData?: () => void;
  startMockHeartData?: () => void;
  stopMockHeartData?: () => void;
  setConnectionState?: (state: ConnectionState) => void;
  setBrbEnabled?: (enabled: boolean) => void;
  setHeartEnabled?: (enabled: boolean) => void;
  setCompactEnabled?: (enabled: boolean) => void;
}

export function useHomeAssistant(isDevPanel: boolean = false): HomeAssistantReturn {
  onMounted(() => {
    connectToHA();
  });

  onUnmounted(() => {
    cleanupSocket();
    stopMockStepData();
    stopMockHeartData();
  });

  return {
    steps: readonly(steps),
    distance: readonly(distance),
    speed: readonly(speed),
    connectionState: readonly(connectionState),
    brbEnabled: readonly(brbEnabled),
    heartEnabled: readonly(heartEnabled),
    compactEnabled: readonly(compactEnabled),
    heartRate: readonly(heartRate),
    connectionLost: readonly(connectionLost),
    getEntityState,
    startMockStepData: isDevPanel ? startMockStepData : undefined,
    stopMockStepData: isDevPanel ? stopMockStepData : undefined,
    startMockHeartData: isDevPanel ? startMockHeartData : undefined,
    stopMockHeartData: isDevPanel ? stopMockHeartData : undefined,
    setConnectionState: isDevPanel ? setConnectionState : undefined,
    setBrbEnabled: isDevPanel ? setBrbEnabled : undefined,
    setHeartEnabled: isDevPanel ? setHeartEnabled : undefined,
    setCompactEnabled: isDevPanel ? setCompactEnabled : undefined,
  };
}
