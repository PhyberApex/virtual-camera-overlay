import type { Size2 } from './widgetLayout';

export interface FramingConfig {
  /** Largest zoom factor auto-framing may apply. */
  maxZoom: number;
  /** Fraction of the stage a framing change must exceed before the picture moves. */
  deadZone: number;
  /** Duration of the ease to a new framing, in milliseconds. */
  easeMs: number;
  /** Where the face centre should sit vertically, as a fraction of the stage height. */
  targetY: number;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scale about the stage centre, then translate, both in stage units. */
export interface Framing {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_FRAMING_CONFIG: FramingConfig = {
  maxZoom: 1.5,
  deadZone: 0.05,
  easeMs: 500,
  targetY: 1 / 3,
};

export const IDENTITY_FRAMING: Framing = { scale: 1, x: 0, y: 0 };

/** The face is zoomed towards this share of the stage height. */
const DESIRED_FACE_HEIGHT = 0.3;

/**
 * The framing that keeps the face centred horizontally and around `targetY`, zoomed in towards
 * a comfortable face size but never past `maxZoom`. The result never reveals the edges of the
 * picture. When it differs from `current` by less than the dead zone, `current` is returned so
 * small movements do not make the picture drift.
 */
export const computeFraming = (
  face: FaceBox,
  stage: Size2,
  config: FramingConfig,
  current: Framing = IDENTITY_FRAMING
): Framing => {
  const maxZoom = Math.max(1, config.maxZoom);
  const wanted = (stage.height * DESIRED_FACE_HEIGHT) / Math.max(face.height, 1);
  const scale = Math.min(maxZoom, Math.max(1, wanted));

  const limitX = (stage.width * (scale - 1)) / 2;
  const limitY = (stage.height * (scale - 1)) / 2;
  const centreX = stage.width / 2;
  const centreY = stage.height / 2;
  const faceX = face.x + face.width / 2;
  const faceY = face.y + face.height / 2;
  const clamp = (value: number, limit: number): number => Math.min(limit, Math.max(-limit, value));
  const target: Framing = {
    scale,
    x: clamp(-scale * (faceX - centreX), limitX),
    y: clamp(config.targetY * stage.height - centreY - scale * (faceY - centreY), limitY),
  };

  const withinDeadZone =
    Math.abs(target.x - current.x) < config.deadZone * stage.width &&
    Math.abs(target.y - current.y) < config.deadZone * stage.height &&
    Math.abs(target.scale - current.scale) < config.deadZone;
  return withinDeadZone ? current : target;
};
