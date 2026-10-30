import { describe, it, expect } from 'vitest';
import {
  computeWidgetPosition,
  computeCornerStyle,
  computeStageTransform,
  computeFaceAnchoredPosition,
  computeFaceFollowOffset,
} from '../../utils/widgetLayout';

describe('computeWidgetPosition', () => {
  const viewport = { width: 1920, height: 1080 };
  const size = { width: 240, height: 190 };
  const offset = { x: 30, y: 30 };

  it('anchors bottom-right, matching the overlay default steps-widget placement', () => {
    expect(computeWidgetPosition('bottom-right', offset, size, viewport)).toEqual({
      x: 1920 - 240 - 30,
      y: 1080 - 190 - 30,
    });
  });

  it('anchors top-left using the offset directly, with no viewport subtraction', () => {
    expect(computeWidgetPosition('top-left', offset, size, viewport)).toEqual({
      x: 30,
      y: 30,
    });
  });

  it('anchors top-right by subtracting width+offset from the viewport width only', () => {
    expect(computeWidgetPosition('top-right', offset, size, viewport)).toEqual({
      x: 1920 - 240 - 30,
      y: 30,
    });
  });

  it('anchors bottom-left by subtracting height+offset from the viewport height only', () => {
    expect(computeWidgetPosition('bottom-left', offset, size, viewport)).toEqual({
      x: 30,
      y: 1080 - 190 - 30,
    });
  });

  it('recomputes against a new viewport size for right/bottom anchors', () => {
    const smallerViewport = { width: 1280, height: 900 };
    expect(computeWidgetPosition('bottom-right', offset, size, smallerViewport)).toEqual({
      x: 1280 - 240 - 30,
      y: 900 - 190 - 30,
    });
  });
});

describe('computeCornerStyle', () => {
  const offset = { x: 20, y: 20 };

  it('anchors top-left to top/left, leaving bottom/right unset', () => {
    expect(computeCornerStyle('top-left', offset)).toEqual({ top: '20px', left: '20px' });
  });

  it('anchors top-right to top/right, leaving bottom/left unset', () => {
    expect(computeCornerStyle('top-right', offset)).toEqual({ top: '20px', right: '20px' });
  });

  it('anchors bottom-left to bottom/left, leaving top/right unset', () => {
    expect(computeCornerStyle('bottom-left', offset)).toEqual({ bottom: '20px', left: '20px' });
  });

  it('anchors bottom-right to bottom/right, leaving top/left unset', () => {
    expect(computeCornerStyle('bottom-right', offset)).toEqual({ bottom: '20px', right: '20px' });
  });

  it('reflects whatever offset is passed in, independent of size', () => {
    expect(computeCornerStyle('bottom-right', { x: 5, y: 15 })).toEqual({
      bottom: '15px',
      right: '5px',
    });
  });
});

describe('computeStageTransform', () => {
  it('uses scale 1 and no offset when the window matches the stage', () => {
    expect(computeStageTransform({ width: 1920, height: 1080 })).toEqual({
      scale: 1,
      left: 0,
      top: 0,
    });
  });

  it('letterboxes top and bottom in a taller window', () => {
    expect(computeStageTransform({ width: 960, height: 900 })).toEqual({
      scale: 0.5,
      left: 0,
      top: 180,
    });
  });

  it('pillarboxes left and right in a wider window', () => {
    expect(computeStageTransform({ width: 2560, height: 540 })).toEqual({
      scale: 0.5,
      left: 800,
      top: 0,
    });
  });
});

describe('computeFaceAnchoredPosition', () => {
  const stage = { width: 1920, height: 1080 };
  const size = { width: 100, height: 80 };

  it('sits right of the face, centred on its height', () => {
    expect(
      computeFaceAnchoredPosition({ x: 800, y: 300, width: 200, height: 260 }, stage, size)
    ).toEqual({
      x: 1024,
      y: 390,
    });
  });

  it('flips to the left when the right side would leave the stage', () => {
    expect(
      computeFaceAnchoredPosition({ x: 1700, y: 300, width: 200, height: 260 }, stage, size)
    ).toEqual({
      x: 1576,
      y: 390,
    });
  });

  it('never leaves the left edge', () => {
    expect(
      computeFaceAnchoredPosition({ x: 10, y: 0, width: 1900, height: 100 }, stage, size).x
    ).toBe(0);
  });
});

describe('computeFaceFollowOffset', () => {
  it('is the distance from the configured corner to the face-anchored position', () => {
    expect(
      computeFaceFollowOffset(
        { x: 800, y: 300, width: 200, height: 260 },
        'top-left',
        { x: 20, y: 20 },
        { width: 100, height: 80 },
        { width: 1920, height: 1080 }
      )
    ).toEqual({ x: 1004, y: 370 });
  });
});
