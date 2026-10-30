import { onMounted, onUnmounted, readonly, ref, watch, type Ref } from 'vue';
import { getHaToken, invalidateRuntimeConfig } from './useRuntimeConfig';
import { useWidgetManager } from './useWidgetManager';
import { useOverlayConfig, type OverlayEntities } from './useOverlayConfig';

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
    a?: Record<string, { s: string | number; lu?: number }>;
    c?: Record<string, { '+'?: { s?: string | number; lu?: number } }>;
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
const AUTH_TIMEOUT_PERIOD = 10_000;
const HEART_RATE_STALE_AFTER = 3 * 60_000;

let socket: WebSocket | null = null;
let isConnecting = false;
let msgId: number = 1;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let missedHeartbeats = 0;
let connectionLossTimer: number | null = null;
let authDeadlineTimer: number | null = null;
let authOkReceived = false;
let heartRateStaleTimer: number | null = null;
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

const clearHeartRateStaleTimer = (): void => {
  clearTimeoutSafe(heartRateStaleTimer);
  heartRateStaleTimer = null;
};

const clearAuthDeadlineTimer = (): void => {
  clearTimeoutSafe(authDeadlineTimer);
  authDeadlineTimer = null;
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
    void connectToHA(true);
  }, delay);
};

const startHeartbeat = (): void => {
  resetHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify({ id: msgId++, type: 'ping' }));
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

const detachAndClose = (): void => {
  if (!socket) return;
  socket.onopen = null;
  socket.onclose = null;
  socket.onerror = null;
  socket.onmessage = null;
  socket.close();
  socket = null;
};

const forceReconnect = (): void => {
  resetHeartbeat();
  resetReconnectTimer();
  clearAuthDeadlineTimer();
  detachAndClose();
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
  detachAndClose();

  resetHeartbeat();
  resetReconnectTimer();
  clearConnectionLossTimer();
  clearAuthDeadlineTimer();
};

const handleConnectionDrop = (): void => {
  console.warn('[HomeAssistant] Connection dropped, scheduling reconnect');
  if (!authOkReceived) {
    invalidateRuntimeConfig();
  }
  cleanupSocket();
  connectionState.value = 'disconnected';
  scheduleReconnect();
};

const handleAuthDeadlineElapsed = (): void => {
  authDeadlineTimer = null;
  console.warn('[HomeAssistant] Authentication timed out, treating as a dropped connection');
  handleConnectionDrop();
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
  connectionLost.value = false;

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
  // Mock readings never come from HA, so they always count as fresh.
  clearHeartRateStaleTimer();
  // Initial values
  heartRate.value = 65;
  connectionState.value = 'connected';
  connectionLost.value = false;

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
  detachAndClose();
};

const connectToHA = async (isReconnect = false): Promise<void> => {
  if (socket || isConnecting) return;
  isConnecting = true;

  try {
    await connectToHAInner(isReconnect);
  } finally {
    isConnecting = false;
  }
};

const buildHaWebSocketUrl = (isDev: boolean): string | null => {
  const protocol: string = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (!isDev) {
    // window.location.host omits the port when it is the scheme default
    return `${protocol}//${window.location.host}/api/websocket`;
  }
  if (!devHost || !devPort || devHost.includes('your_') || devPort.includes('your_')) {
    return null;
  }
  return `${protocol}//${devHost}:${devPort}/api/websocket`;
};

// HA's `lu` is unix seconds. A reading older than the window is hidden (heartRate 0)
// at once and a fresh one is hidden when it ages out. A missing `lu` counts as fresh.
const applyHeartRate = (
  state: string | number,
  unavailable: boolean,
  lastUpdated: number | undefined
): void => {
  clearHeartRateStaleTimer();
  const parsed = unavailable ? undefined : parseFiniteFloat(state);
  if (parsed === undefined) {
    if (unavailable) heartRate.value = 0;
    return;
  }
  const remaining =
    typeof lastUpdated === 'number' && Number.isFinite(lastUpdated)
      ? lastUpdated * 1000 + HEART_RATE_STALE_AFTER - Date.now()
      : HEART_RATE_STALE_AFTER;
  if (remaining <= 0) {
    heartRate.value = 0;
    return;
  }
  heartRate.value = parsed;
  heartRateStaleTimer = window.setTimeout(() => {
    heartRateStaleTimer = null;
    heartRate.value = 0;
  }, remaining);
};

// Shared by snapshot (`a`) and change (`c`) events. `state` is undefined when an
// attribute-only diff carries no state, which must leave every value untouched.
const applyEntityState = (
  entities: OverlayEntities,
  entityId: string,
  state: string | number | undefined,
  lastUpdated?: number
): void => {
  if (state === undefined) return;
  const unavailable = isUnavailableState(state);
  if (!unavailable) {
    entityStates.value[entityId] = state;
  }

  const applyNumber = (target: Ref<number>, parse: (s: typeof state) => number | undefined) => {
    if (unavailable) {
      target.value = 0;
      return;
    }
    const parsed = parse(state);
    if (parsed !== undefined) target.value = parsed;
  };

  if (entityId === entities.steps) {
    applyNumber(steps, s => {
      const parsed = parseInt(String(s), 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    });
  }
  if (entityId === entities.distance) applyNumber(distance, parseFiniteFloat);
  if (entityId === entities.speed) applyNumber(speed, parseFiniteFloat);
  if (entityId === entities.heartRate) applyHeartRate(state, unavailable, lastUpdated);
  if (entityId === entities.brbToggle) brbEnabled.value = state === 'on';
  if (entityId === entities.heartToggle) heartEnabled.value = state === 'on';
  if (entityId === entities.compactToggle) compactEnabled.value = state === 'on';
};

const connectToHAInner = async (isReconnect: boolean): Promise<void> => {
  const {
    entities: overlayEntities,
    configUnreachable,
    ensureOverlayConfigLoaded,
  } = useOverlayConfig();
  const configValid = await ensureOverlayConfigLoaded();
  const configuredEntities = overlayEntities.value;
  if (!configValid || !configuredEntities) {
    connectionState.value = 'disconnected';
    // An unreachable config file is transient; an invalid one is fatal.
    if (configUnreachable.value) scheduleReconnect();
    return;
  }

  // Use different URLs for development and production
  const isDev: boolean = import.meta.env.DEV as boolean;
  const url = buildHaWebSocketUrl(isDev);
  if (!url) {
    console.warn('[HomeAssistant] Invalid or missing HA connection config, skipping connection');
    connectionState.value = 'disconnected';
    return;
  }

  if (!isReconnect) {
    reconnectAttempts = 0;
  }

  console.log(
    `Connecting to Home Assistant at ${url} (${isDev ? 'development' : 'production'} mode)`
  );
  connectionState.value = 'authenticating';
  const ws = new WebSocket(url);
  socket = ws;
  authOkReceived = false;
  clearAuthDeadlineTimer();
  authDeadlineTimer = window.setTimeout(handleAuthDeadlineElapsed, AUTH_TIMEOUT_PERIOD);

  ws.onopen = (): void => {
    console.log('WebSocket connection established, authenticating...');
  };

  ws.onerror = (error): void => {
    if (socket !== ws) return;
    console.error('[HomeAssistant] WebSocket error', error);
    handleConnectionDrop();
  };

  ws.onclose = (): void => {
    if (socket !== ws) return;
    handleConnectionDrop();
  };

  ws.onmessage = async (event: MessageEvent): Promise<void> => {
    if (socket !== ws) return;
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
      authOkReceived = true;
      clearAuthDeadlineTimer();
      updateAuthenticatedState();
      connectionState.value = 'connected';
      console.log('Authentication successful');

      // Subscribe to state changes
      subscribeToEntities(configuredEntities);
    }
    // Initial state snapshot
    else if (message.type === 'event' && message.event && message.event.a) {
      const eventData = message.event.a;
      clearConnectionLossTimer();
      connectionLost.value = false;

      for (const [entityId, state] of Object.entries(eventData)) {
        applyEntityState(configuredEntities, entityId, state.s, state.lu);
      }
      // A snapshot is the full picture: a compact toggle it omits is off.
      if (!(configuredEntities.compactToggle in eventData)) {
        compactEnabled.value = false;
      }
    } else if (message.type === 'event' && message.event && message.event.c) {
      const eventData = message.event.c;

      for (const [entityId, diff] of Object.entries(eventData)) {
        applyEntityState(configuredEntities, entityId, diff['+']?.s, diff['+']?.lu);
      }
    }
  };
};

const subscribeToEntities = (configuredEntities: OverlayEntities): void => {
  const { widgets } = useWidgetManager();
  const widgetEntityIds = widgets.value
    .map(w => w.props?.entityId as string | undefined)
    .filter((id): id is string => !!id);

  const entityIds: string[] = [
    ...new Set([
      configuredEntities.steps,
      configuredEntities.distance,
      configuredEntities.speed,
      configuredEntities.brbToggle,
      configuredEntities.heartRate,
      configuredEntities.heartToggle,
      configuredEntities.compactToggle,
      ...widgetEntityIds,
    ]),
  ];

  socket?.send(
    JSON.stringify({
      id: msgId++,
      type: 'subscribe_entities',
      entity_ids: entityIds,
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

let consumers = 0;

export function useHomeAssistant(isDevPanel: boolean = false): HomeAssistantReturn {
  onMounted(() => {
    consumers += 1;
    void connectToHA();
  });

  onUnmounted(() => {
    consumers -= 1;
    if (consumers > 0) return;
    cleanupSocket();
    connectionState.value = 'disconnected';
    stopMockStepData();
    stopMockHeartData();
    clearHeartRateStaleTimer();
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
