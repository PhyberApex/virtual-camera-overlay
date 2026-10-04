import { ref, type Ref } from 'vue';
import type { WidgetAnchor, Vector2, Size2 } from '../utils/widgetLayout';

export type WidgetType = 'steps' | 'temperature' | 'sensor';

export interface OverlayWidgetProps {
  entityId?: string;
  unit?: string;
  displayName?: string;
}

export interface OverlayWidgetConfig {
  id: string;
  type: WidgetType;
  anchor: WidgetAnchor;
  offset: Vector2;
  size: Size2;
  props?: OverlayWidgetProps;
}

export interface OverlayEntities {
  steps: string;
  distance: string;
  speed: string;
  heartRate: string;
  brbToggle: string;
  heartToggle: string;
  compactToggle: string;
}

interface OverlayConfig {
  maxHeartRate?: unknown;
  entities: OverlayEntities;
  widgets: OverlayWidgetConfig[];
}

export const DEFAULT_MAX_HEART_RATE = 185;

const ENTITY_KEYS: Array<keyof OverlayEntities> = [
  'steps',
  'distance',
  'speed',
  'heartRate',
  'brbToggle',
  'heartToggle',
  'compactToggle',
];

const WIDGET_ANCHORS: WidgetAnchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const WIDGET_TYPES: WidgetType[] = ['steps', 'temperature', 'sensor'];

const maxHeartRate: Ref<number> = ref(DEFAULT_MAX_HEART_RATE);
const entities: Ref<OverlayEntities | null> = ref(null);
const widgets: Ref<OverlayWidgetConfig[]> = ref([]);

let fetchPromise: Promise<boolean> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isVector2 = (value: unknown): value is Vector2 =>
  isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);

const isSize2 = (value: unknown): value is Size2 =>
  isRecord(value) && isFiniteNumber(value.width) && isFiniteNumber(value.height);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const isValidEntities = (value: unknown): value is OverlayEntities =>
  isRecord(value) && ENTITY_KEYS.every(key => isNonEmptyString(value[key]));

const isValidWidgetProps = (value: unknown): value is OverlayWidgetProps | undefined => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    (value.entityId === undefined || typeof value.entityId === 'string') &&
    (value.unit === undefined || typeof value.unit === 'string') &&
    (value.displayName === undefined || typeof value.displayName === 'string')
  );
};

const isValidWidget = (value: unknown): value is OverlayWidgetConfig =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  typeof value.type === 'string' &&
  WIDGET_TYPES.includes(value.type as WidgetType) &&
  typeof value.anchor === 'string' &&
  WIDGET_ANCHORS.includes(value.anchor as WidgetAnchor) &&
  isVector2(value.offset) &&
  isSize2(value.size) &&
  isValidWidgetProps(value.props);

const isValidConfig = (value: unknown): value is OverlayConfig =>
  isRecord(value) &&
  isValidEntities(value.entities) &&
  Array.isArray(value.widgets) &&
  value.widgets.every(isValidWidget);

const loadOverlayConfig = (): Promise<boolean> => {
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetch('overlay-config.json', { cache: 'no-cache' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Overlay config request failed with status ${response.status}`);
      }
      return (await response.json()) as unknown;
    })
    .then(config => {
      if (!isValidConfig(config)) {
        throw new Error('Overlay config failed validation');
      }

      entities.value = config.entities;
      widgets.value = config.widgets;
      if (typeof config.maxHeartRate === 'number') {
        maxHeartRate.value = config.maxHeartRate;
      }
      return true;
    })
    .catch(error => {
      console.error(
        '[OverlayConfig] Failed to load a valid overlay-config.json; rendering nothing',
        error
      );
      return false;
    });

  return fetchPromise;
};

export const useOverlayConfig = (): {
  maxHeartRate: Ref<number>;
  entities: Ref<OverlayEntities | null>;
  widgets: Ref<OverlayWidgetConfig[]>;
  ensureOverlayConfigLoaded: () => Promise<boolean>;
} => {
  void loadOverlayConfig();
  return { maxHeartRate, entities, widgets, ensureOverlayConfigLoaded: loadOverlayConfig };
};
