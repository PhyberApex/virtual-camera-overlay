import { describe, it, expect } from 'vitest';
import { computeWidgetPosition, computeCornerStyle } from '../../utils/widgetLayout';

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
