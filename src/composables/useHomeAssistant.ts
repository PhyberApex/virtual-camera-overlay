import { onMounted, onUnmounted, readonly, ref, type Ref } from 'vue';

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

type HAMessage = HAAuthRequiredMessage | HAAuthOkMessage | HAEventMessage;

const steps: Ref<number> = ref(0);
const speed: Ref<number> = ref(0);
const distance: Ref<number> = ref(0);
const connectionState: Ref<ConnectionState> = ref('disconnected');
const brbEnabled: Ref<boolean> = ref(false);
const heartEnabled: Ref<boolean> = ref(false);
const heartRate: Ref<number> = ref(70)

let socket: WebSocket | null = null;
let msgId: number = 1;
let mockDataInterval: number | null = null;
const token: string = import.meta.env.VITE_HA_TOKEN as string;
const devHost: string = import.meta.env.VITE_HA_DEV_HOST as string;
const port: string = import.meta.env.VITE_HA_PORT as string;

// Generate mock data for development
const startMockStepData = (): void => {
  if (mockDataInterval) clearInterval(mockDataInterval);

  console.log('Starting mock data generation');
  // Initial values
  steps.value = 1250;
  speed.value = 3.5;
  connectionState.value = 'connected';

  mockDataInterval = window.setInterval(() => {
    // Randomly update steps (increment by 5-15 steps every second)
    steps.value += Math.floor(Math.random() * 10) + 5;

    // Randomly fluctuate speed between 3.0 and 6.0
    speed.value = parseFloat((3 + Math.random() * 3).toFixed(1));

    console.log(`Mock data updated: ${steps.value} steps, ${speed.value} km/h`);
  }, 1000);
};

// Stop mock data generation
const stopMockStepData = (): void => {
  if (mockDataInterval) {
    clearInterval(mockDataInterval);
    mockDataInterval = null;
    console.log('Stopped mock data generation');
  }
};

const connectToHA = (): void => {
  if (socket) return;
  // Use different URLs for development and production
  const isDev: boolean = import.meta.env.DEV as boolean;
  const host: string = isDev ? devHost : window.location.hostname;
  const url: string = `ws://${host}:${port}/api/websocket`;
  console.log(
    `Connecting to Home Assistant at ${url} (${isDev ? 'development' : 'production'} mode)`
  );
  socket = new WebSocket(url);

  socket.onopen = (): void => {
    connectionState.value = 'authenticating';
    console.log('WebSocket connection established, authenticating...');
  };

  socket.onmessage = (event: MessageEvent): void => {
    const message: HAMessage = JSON.parse(event.data);
    console.log('Received message:', message);

    // Handle authentication
    if (message.type === 'auth_required') {
      socket?.send(
        JSON.stringify({
          type: 'auth',
          access_token: token,
        })
      );
    } else if (message.type === 'auth_ok') {
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

      const distanceData = eventData['sensor.sensor.ksmb_v1_7aed_current_distance']?.s;
      if (distanceData !== 'unavailable' && typeof distanceData === 'number') {
        distance.value = distanceData;
      }

      const speedData = eventData['number.ksmb_v1_7aed_speed_level']?.s;
      if (speedData !== 'unavailable' && typeof speedData === 'number') {
        speed.value = speedData;
      }
      const heartData = eventData['sensor.sm_s921b_heart_rate']?.s;
      if (heartData !== 'unavailable' && typeof heartData === 'number') {
        heartRate.value = speedData;
      }

      brbEnabled.value = eventData['input_boolean.janis_vco_brb']?.s === 'on';
      heartEnabled.value = eventData['input_boolean.janis_vco_heart']?.s === 'on';
    } else if (message.type === 'event' && message.event && message.event.c) {
      const eventData = message.event.c;

      if (eventData['sensor.ksmb_v1_7aed_current_step_count']) {
        const newSteps = eventData['sensor.ksmb_v1_7aed_current_step_count']['+']?.s;
        if (typeof newSteps === 'number' || typeof newSteps === 'string') {
          steps.value = parseInt(String(newSteps), 10);
        }
      } else if (eventData['sensor.ksmb_v1_7aed_current_distance']) {
        const newDistance = eventData['sensor.ksmb_v1_7aed_current_distance']['+']?.s;
        if (typeof newDistance === 'number') {
          distance.value = newDistance;
        } else if (typeof newDistance === 'string') {
          distance.value = parseFloat(newDistance);
        }
      } else if (eventData['number.ksmb_v1_7aed_speed_level']) {
        const newSpeed = eventData['number.ksmb_v1_7aed_speed_level']['+']?.s;
        if (typeof newSpeed === 'number') {
          speed.value = newSpeed;
        } else if (typeof newSpeed === 'string') {
          speed.value = parseFloat(newSpeed);
        }
      } else if (eventData['input_boolean.janis_vco_brb']) {
        brbEnabled.value = eventData['input_boolean.janis_vco_brb']['+']?.s === 'on';
      } else if (eventData['input_boolean.janis_vco_heart']) {
        heartEnabled.value = eventData['input_boolean.janis_vco_heart']['+']?.s === 'on';
      } else if (eventData['sensor.sm_s921b_heart_rate']) {
        const newHeart = eventData['sensor.sm_s921b_heart_rate']['+']?.s;
        if (typeof newHeart === 'number') {
          heartRate.value = newHeart;
        } else if (typeof newHeart === 'string') {
          heartRate.value = parseFloat(newHeart);
        }
      }
    }
  };

  socket.onclose = (): void => {
    connectionState.value = 'disconnected';
    console.log('WebSocket connection closed');
    // Try to reconnect after a delay
    setTimeout(connectToHA, 5000);
  };

  socket.onerror = (error: Event): void => {
    console.error('WebSocket error:', error);
    socket?.close();
  };
};

// Subscribe to entity state changes
const subscribeToEntities = (): void => {
  const entities: string[] = [
    'sensor.ksmb_v1_7aed_current_step_count',
    'sensor.ksmb_v1_7aed_current_distance',
    'number.ksmb_v1_7aed_speed_level',
    'input_boolean.janis_vco_brb',
    'sensor.sm_s921b_heart_rate',
    'input_boolean.janis_vco_heart',
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

interface HomeAssistantReturn {
  steps: Readonly<Ref<number>>;
  distance: Readonly<Ref<number>>;
  speed: Readonly<Ref<number>>;
  connectionState: Readonly<Ref<ConnectionState>>;
  brbEnabled: Readonly<Ref<boolean>>;
  heartEnabled: Readonly<Ref<boolean>>;
  heartRate: Readonly<Ref<number>>;
  startMockStepData?: () => void;
  stopMockStepData?: () => void;
  setConnectionState?: (state: ConnectionState) => void;
  setBrbEnabled?: (enabled: boolean) => void;
  setHeartEnabled?: (enabled: boolean) => void;
}

export function useHomeAssistant(isDevPanel: boolean = false): HomeAssistantReturn {
  onMounted(() => {
    connectToHA();
  });

  onUnmounted(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    stopMockStepData();
  });

  return {
    steps: readonly(steps),
    distance: readonly(distance),
    speed: readonly(speed),
    connectionState: readonly(connectionState),
    brbEnabled: readonly(brbEnabled),
    heartEnabled: readonly(heartEnabled),
    heartRate: readonly(heartRate),
    startMockStepData: isDevPanel ? startMockStepData : undefined,
    stopMockStepData: isDevPanel ? stopMockStepData : undefined,
    setConnectionState: isDevPanel ? setConnectionState : undefined,
    setBrbEnabled: isDevPanel ? setBrbEnabled : undefined,
    setHeartEnabled: isDevPanel ? setHeartEnabled : undefined,
  };
}
