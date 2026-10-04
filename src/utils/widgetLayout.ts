export type WidgetAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size2 {
  width: number;
  height: number;
}

export const computeWidgetPosition = (
  anchor: WidgetAnchor,
  offset: Vector2,
  size: Size2,
  viewport: Size2
): Vector2 => ({
  x: anchor.endsWith('right') ? viewport.width - size.width - offset.x : offset.x,
  y: anchor.startsWith('bottom') ? viewport.height - size.height - offset.y : offset.y,
});
