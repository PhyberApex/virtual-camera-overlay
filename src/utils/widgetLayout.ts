import type { FaceBox } from './framing';

export type WidgetAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size2 {
  width: number;
  height: number;
}

/** The overlay's coordinate system: every widget position and size is in stage units. */
export const STAGE_SIZE: Size2 = { width: 1920, height: 1080 };

export interface StageTransform {
  scale: number;
  left: number;
  top: number;
}

/** Uniformly scales the stage to fit the window and centers it, leaving letterbox bars. */
export const computeStageTransform = (
  windowSize: Size2,
  stage: Size2 = STAGE_SIZE
): StageTransform => {
  const scale = Math.min(windowSize.width / stage.width, windowSize.height / stage.height);
  return {
    scale,
    left: (windowSize.width - stage.width * scale) / 2,
    top: (windowSize.height - stage.height * scale) / 2,
  };
};

export const computeWidgetPosition = (
  anchor: WidgetAnchor,
  offset: Vector2,
  size: Size2,
  stage: Size2
): Vector2 => ({
  x: anchor.endsWith('right') ? stage.width - size.width - offset.x : offset.x,
  y: anchor.startsWith('bottom') ? stage.height - size.height - offset.y : offset.y,
});

export type CornerStyle = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;

/**
 * Positions an intrinsically-sized element against a corner without needing its size,
 * unlike computeWidgetPosition which subtracts a known size from the viewport.
 */
export const computeCornerStyle = (anchor: WidgetAnchor, offset: Vector2): CornerStyle => ({
  ...(anchor.startsWith('top') ? { top: `${offset.y}px` } : { bottom: `${offset.y}px` }),
  ...(anchor.endsWith('left') ? { left: `${offset.x}px` } : { right: `${offset.x}px` }),
});

/** Gap between the head and a face-anchored widget, in stage units. */
export const FACE_ANCHOR_GAP = 24;

/**
 * Top-left position of a widget beside the head, vertically centred on the face (about ear
 * height): to the right of the face, flipping to the left when it would leave the stage.
 */
export const computeFaceAnchoredPosition = (face: FaceBox, stage: Size2, size: Size2): Vector2 => {
  const rightX = face.x + face.width + FACE_ANCHOR_GAP;
  const x = rightX + size.width > stage.width ? face.x - FACE_ANCHOR_GAP - size.width : rightX;
  return { x: Math.max(0, x), y: face.y + (face.height - size.height) / 2 };
};

/**
 * Translation that moves a widget from its configured corner to its face-anchored position,
 * so easing the translation to zero returns it to the corner.
 */
export const computeFaceFollowOffset = (
  face: FaceBox,
  anchor: WidgetAnchor,
  offset: Vector2,
  size: Size2,
  stage: Size2
): Vector2 => {
  const target = computeFaceAnchoredPosition(face, stage, size);
  const corner = computeWidgetPosition(anchor, offset, size, stage);
  return { x: target.x - corner.x, y: target.y - corner.y };
};
