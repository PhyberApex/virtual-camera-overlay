import { onMounted, onUnmounted, readonly, ref } from 'vue';

const steps = ref(0);
const speed = ref(0);
const connectionState = ref('disconnected');

let socket = null;
let msgId = 1;
let mockDataInterval = null;
const token = import.meta.env.VITE_HA_TOKEN;
const devHost = import.meta.env.VITE_HA_DEV_HOST;
const port = import.meta.env.VITE_HA_PORT;

const brbEnabled = ref(false);

// Generate mock data for development
const startMockStepData = () => {
  if (mockDataInterval) clearInterval(mockDataInterval);

  console.log('Starting mock data generation');
  // Initial values
  steps.value = 1250;
  speed.value = 3.5;
  connectionState.value = 'connected';

  mockDataInterval = setInterval(() => {
    // Randomly update steps (increment by 5-15 steps every second)
    steps.value += Math.floor(Math.random() * 10) + 5;

    // Randomly fluctuate speed between 3.0 and 6.0
    speed.value = parseFloat((3 + Math.random() * 3).toFixed(1));

    console.log(`Mock data updated: ${steps.value} steps, ${speed.value} km/h`);
  }, 1000);
};

// Stop mock data generation
const stopMockStepData = () => {
  if (mockDataInterval) {
    clearInterval(mockDataInterval);
    mockDataInterval = null;
    console.log('Stopped mock data generation');
  }
};

const connectToHA = () => {
  if (socket) return;
  // Use different URLs for development and production
  const isDev = import.meta.env.DEV;
  const host = isDev ? devHost : window.location.hostname;
  const url = `ws://${host}:${port}/api/websocket`;
  console.log(
    `Connecting to Home Assistant at ${url} (${isDev ? 'development' : 'production'} mode)`
  );
  socket = new WebSocket(url);

  socket.onopen = () => {
    connectionState.value = 'authenticating';
    console.log('WebSocket connection established, authenticating...');
  };

  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);

    // Handle authentication
    if (message.type === 'auth_required') {
      socket.send(
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
      const stepsData = eventData['sensor.ksmb_v1_7aed_current_step_count'].s;
      if (stepsData !== 'unavailable') {
        steps.value = stepsData;
      }

      const speedData = eventData['number.ksmb_v1_7aed_speed_level'].s;
      if (speedData !== 'unavailable') {
        speed.value = speedData;
      }

      brbEnabled.value = eventData['input_boolean.janis_vco_brb'].s === 'on';
    } else if (message.type === 'event' && message.event && message.event.c) {
      const eventData = message.event.c;

      if (eventData['sensor.ksmb_v1_7aed_current_step_count']) {
        steps.value = parseInt(eventData['sensor.ksmb_v1_7aed_current_step_count']['+']['s']);
      } else if (eventData['number.ksmb_v1_7aed_speed_level']) {
        speed.value = eventData['number.ksmb_v1_7aed_speed_level']['+']['s'];
      } else if (eventData['input_boolean.janis_vco_brb']) {
        brbEnabled.value = eventData['input_boolean.janis_vco_brb']['+']['s'] === 'on';
      }
    }
  };

  socket.onclose = () => {
    connectionState.value = 'disconnected';
    console.log('WebSocket connection closed');
    // Try to reconnect after a delay
    setTimeout(connectToHA, 5000);
  };

  socket.onerror = error => {
    console.error('WebSocket error:', error);
    socket.close();
  };
};

// Subscribe to entity state changes
const subscribeToEntities = () => {
  const entities = [
    'sensor.ksmb_v1_7aed_current_step_count',
    'number.ksmb_v1_7aed_speed_level',
    'input_boolean.janis_vco_brb',
  ];

  socket.send(
    JSON.stringify({
      id: msgId++,
      type: 'subscribe_entities',
      entity_ids: entities,
    })
  );
};

const setConnectionState = state => {
  connectionState.value = state;
};

const setBrbEnabled = enabled => {
  brbEnabled.value = enabled;
};

export function useHomeAssistant(isDevPanel = false) {
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
    speed: readonly(speed),
    connectionState: readonly(connectionState),
    brbEnabled: readonly(brbEnabled),
    startMockStepData: isDevPanel ? startMockStepData : undefined,
    stopMockStepData: isDevPanel ? stopMockStepData : undefined,
    setConnectionState: isDevPanel ? setConnectionState : undefined,
    setBrbEnabled: isDevPanel ? setBrbEnabled : undefined,
  };
}
