import { ref, onMounted, onUnmounted } from 'vue';

const steps = ref(0);
const speed = ref(0);
const isActive = ref(false);
const connectionState = ref('disconnected');
const useMockData = ref(import.meta.env.VITE_USE_MOCK_DATA);

let socket = null;
let msgId = 1;
let mockDataInterval = null;
const token = import.meta.env.VITE_HA_TOKEN;
const devHost = import.meta.env.VITE_HA_DEV_HOST;
const port = import.meta.env.VITE_HA_PORT;

// Generate mock data for development
const startMockData = () => {
    if (mockDataInterval) clearInterval(mockDataInterval);
    
    console.log('Starting mock data generation');
    // Initial values
    steps.value = 1250;
    speed.value = 3.5;
    isActive.value = true;
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
  const stopMockData = () => {
    if (mockDataInterval) {
      clearInterval(mockDataInterval);
      mockDataInterval = null;
      console.log('Stopped mock data generation');
    }
  };
  const connectToHA = () => {
    // Use different URLs for development and production
    const isDev = import.meta.env.DEV;
    const host = isDev ? devHost : window.location.hostname;
    const url = `ws://${host}:${port}/api/websocket`;
    console.log(`Connecting to Home Assistant at ${url} (${isDev ? 'development' : 'production'} mode)`);
    socket = new WebSocket(url);
    
    socket.onopen = () => {
      connectionState.value = 'authenticating';
      console.log('WebSocket connection established, authenticating...');
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      
      // Handle authentication
      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({
          type: 'auth',
          access_token: token
        }));
      } 
      else if (message.type === 'auth_ok') {
        connectionState.value = 'connected';
        console.log('Authentication successful');
        
        // Subscribe to state changes
        subscribeToEntities();
      } 
      else if (message.type === 'event' && message.event && message.event.data) {
        // Handle state changes
        const entityData = message.event.data.new_state;
        if (!entityData) return;
        
        if (entityData.entity_id === 'sensor.ksmb_v1_7aed_current_step_count') {
          const stepCount = parseInt(entityData.state);
          steps.value = stepCount;
          isActive.value = stepCount > 0;
        } 
        else if (entityData.entity_id === 'number.ksmb_v1_7aed_speed_level') {
          speed.value = entityData.state;
        }
      }
    };
    
    socket.onclose = () => {
      connectionState.value = 'disconnected';
      console.log('WebSocket connection closed');
      // Try to reconnect after a delay
      setTimeout(connectToHA, 5000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };
  };
  
  // Subscribe to entity state changes
  const subscribeToEntities = () => {
    const entities = [
      'sensor.ksmb_v1_7aed_current_step_count',
      'number.ksmb_v1_7aed_speed_level'
    ];
    
    socket.send(JSON.stringify({
      id: msgId++,
      type: 'subscribe_entities',
      entity_ids: entities
    }));
  };
  
  // Fetch initial state when connection is established
  const fetchInitialState = () => {
    socket.send(JSON.stringify({
      id: msgId++,
      type: 'get_states'
    }));
  };

  // Toggle mock data on/off (for development)
  const toggleMockData = () => {
    useMockData.value = !useMockData.value;
    if (useMockData.value) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      startMockData();
    } else {
      stopMockData();
      connectToHA();
    }
  };

export function useHomeAssistant() {
  onMounted(() => {
    if (useMockData.value) {
      startMockData();
    } else {
      connectToHA();
    }
  });
  
  onUnmounted(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    stopMockData();
  });

  return {
    steps,
    speed,
    isActive,
    connectionState,
    useMockData,
    toggleMockData
  };
}