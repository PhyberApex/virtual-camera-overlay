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
  compactSize?: Size2;
  props?: OverlayWidgetProps;
}

export interface HeartRateLayout {
  anchor: WidgetAnchor;
  offset: Vector2;
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
  heartRate?: unknown;
  entities: OverlayEntities;
  widgets: OverlayWidgetConfig[];
}

export const DEFAULT_MAX_HEART_RATE = 185;
export const DEFAULT_HEART_RATE_LAYOUT: HeartRateLayout = {
  anchor: 'top-left',
  offset: { x: 20, y: 20 },
};

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
const heartRateLayout: Ref<HeartRateLayout> = ref({ ...DEFAULT_HEART_RATE_LAYOUT });
const entities: Ref<OverlayEntities | null> = ref(null);
const widgets: Ref<OverlayWidgetConfig[]> = ref([]);

// True once a valid config has been applied; consumers watch it to build widgets.
const configLoaded: Ref<boolean> = ref(false);
// True when the last failure was the file being unreachable (network/HTTP), which is retried.
// An invalid config is fatal and stays cached.
const configUnreachable: Ref<boolean> = ref(false);

let fetchPromise: Promise<boolean> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isVector2 = (value: unknown): value is Vector2 =>
  isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);

const isPositiveFiniteNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const isValidAnchorOffset = (value: Record<string, unknown>): boolean =>
  typeof value.anchor === 'string' &&
  WIDGET_ANCHORS.includes(value.anchor as WidgetAnchor) &&
  isVector2(value.offset);

const isValidHeartRateLayout = (value: unknown): value is HeartRateLayout =>
  isRecord(value) && isValidAnchorOffset(value);

const checkVector2 = (value: unknown, path: string): string | null => {
  if (!isRecord(value)) return `${path}: expected an object`;
  if (!isFiniteNumber(value.x)) return `${path}.x: expected a finite number`;
  if (!isFiniteNumber(value.y)) return `${path}.y: expected a finite number`;
  return null;
};

const checkSize2 = (value: unknown, path: string): string | null => {
  if (!isRecord(value)) return `${path}: expected an object`;
  if (!isPositiveFiniteNumber(value.width))
    return `${path}.width: expected a positive finite number`;
  if (!isPositiveFiniteNumber(value.height))
    return `${path}.height: expected a positive finite number`;
  return null;
};

const checkWidgetProps = (value: unknown, path: string): string | null => {
  if (value === undefined) return null;
  if (!isRecord(value)) return `${path}: expected an object`;
  for (const key of ['entityId', 'unit', 'displayName'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      return `${path}.${key}: expected a string`;
    }
  }
  return null;
};

const checkWidget = (value: unknown, path: string): string | null => {
  if (!isRecord(value)) return `${path}: expected an object`;
  if (!isNonEmptyString(value.id)) return `${path}.id: expected a non-empty string`;
  if (typeof value.type !== 'string' || !WIDGET_TYPES.includes(value.type as WidgetType)) {
    return `${path}.type: expected one of ${WIDGET_TYPES.join(', ')}`;
  }
  if (typeof value.anchor !== 'string' || !WIDGET_ANCHORS.includes(value.anchor as WidgetAnchor)) {
    return `${path}.anchor: expected one of ${WIDGET_ANCHORS.join(', ')}`;
  }
  const failure =
    checkVector2(value.offset, `${path}.offset`) ??
    checkSize2(value.size, `${path}.size`) ??
    (value.compactSize === undefined
      ? null
      : checkSize2(value.compactSize, `${path}.compactSize`)) ??
    checkWidgetProps(value.props, `${path}.props`);
  if (failure) return failure;
  if (value.type !== 'steps') {
    const props = value.props as OverlayWidgetProps | undefined;
    if (!isNonEmptyString(props?.entityId)) {
      return `${path}.props.entityId: expected a non-empty string (required for ${value.type} widgets)`;
    }
  }
  return null;
};

// Returns the first failing path with what was expected, or null when the config is valid.
const findConfigError = (value: unknown): string | null => {
  if (!isRecord(value)) return 'config: expected an object';
  if (!isRecord(value.entities)) return 'entities: expected an object';
  for (const key of ENTITY_KEYS) {
    if (!isNonEmptyString(value.entities[key])) {
      return `entities.${key}: expected a non-empty string`;
    }
  }
  if (!Array.isArray(value.widgets)) return 'widgets: expected an array';
  const seen = new Set<string>();
  for (const [index, widget] of value.widgets.entries()) {
    const path = `widgets[${index}]`;
    const failure = checkWidget(widget, path);
    if (failure) return failure;
    const id = (widget as OverlayWidgetConfig).id;
    if (seen.has(id)) return `${path}.id: expected a unique id, "${id}" is used twice`;
    seen.add(id);
  }
  return null;
};

const loadOverlayConfig = (): Promise<boolean> => {
  if (fetchPromise) {
    return fetchPromise;
  }

  let unreachable = false;
  fetchPromise = fetch('overlay-config.json', { cache: 'no-cache' })
    .then(
      response => {
        if (!response.ok) {
          unreachable = true;
          throw new Error(`Overlay config request failed with status ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      },
      (error: unknown) => {
        unreachable = true;
        throw error;
      }
    )
    .then(config => {
      const configError = findConfigError(config);
      if (configError) {
        throw new Error(`Overlay config failed validation: ${configError}`);
      }
      const validConfig = config as OverlayConfig;

      entities.value = validConfig.entities;
      widgets.value = validConfig.widgets;
      if (isPositiveFiniteNumber(validConfig.maxHeartRate)) {
        maxHeartRate.value = validConfig.maxHeartRate;
      } else {
        maxHeartRate.value = DEFAULT_MAX_HEART_RATE;
        if (validConfig.maxHeartRate !== undefined) {
          console.warn(
            `[OverlayConfig] Invalid maxHeartRate; falling back to ${DEFAULT_MAX_HEART_RATE}`,
            validConfig.maxHeartRate
          );
        }
      }
      if (isValidHeartRateLayout(validConfig.heartRate)) {
        heartRateLayout.value = validConfig.heartRate;
      } else {
        heartRateLayout.value = { ...DEFAULT_HEART_RATE_LAYOUT };
        console.warn(
          '[OverlayConfig] Invalid or missing heartRate config; falling back to top-left, {x: 20, y: 20}',
          validConfig.heartRate
        );
      }
      configUnreachable.value = false;
      configLoaded.value = true;
      return true;
    })
    .catch(error => {
      configUnreachable.value = unreachable;
      if (unreachable) {
        // Drop the cached promise so the next call re-fetches.
        fetchPromise = null;
        console.warn('[OverlayConfig] overlay-config.json unreachable; will retry', error);
      } else {
        console.error(
          '[OverlayConfig] Failed to load a valid overlay-config.json; rendering nothing',
          error
        );
      }
      return false;
    });

  return fetchPromise;
};

export const useOverlayConfig = (): {
  maxHeartRate: Ref<number>;
  heartRateLayout: Ref<HeartRateLayout>;
  entities: Ref<OverlayEntities | null>;
  widgets: Ref<OverlayWidgetConfig[]>;
  configLoaded: Ref<boolean>;
  configUnreachable: Ref<boolean>;
  ensureOverlayConfigLoaded: () => Promise<boolean>;
} => {
  void loadOverlayConfig();
  return {
    maxHeartRate,
    heartRateLayout,
    entities,
    widgets,
    configLoaded,
    configUnreachable,
    ensureOverlayConfigLoaded: loadOverlayConfig,
  };
};
