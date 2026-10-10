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

export type CornerStyle = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;

/**
 * Positions an intrinsically-sized element against a corner without needing its size,
 * unlike computeWidgetPosition which subtracts a known size from the viewport.
 */
export const computeCornerStyle = (anchor: WidgetAnchor, offset: Vector2): CornerStyle => ({
  ...(anchor.startsWith('top') ? { top: `${offset.y}px` } : { bottom: `${offset.y}px` }),
  ...(anchor.endsWith('left') ? { left: `${offset.x}px` } : { right: `${offset.x}px` }),
});
