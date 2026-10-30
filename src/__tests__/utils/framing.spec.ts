import { describe, it, expect } from 'vitest';
import {
  computeFraming,
  DEFAULT_FRAMING_CONFIG,
  IDENTITY_FRAMING,
  type FaceBox,
} from '../../utils/framing';

const stage = { width: 1920, height: 1080 };
const config = DEFAULT_FRAMING_CONFIG;
const faceAt = (cx: number, cy: number, height: number): FaceBox => ({
  x: cx - height / 2,
  y: cy - height / 2,
  width: height,
  height,
});

describe('computeFraming', () => {
  it('zooms in on a small face and puts it on the upper third', () => {
    const f = computeFraming(faceAt(960, 540, 200), stage, config);
    expect(f.scale).toBeCloseTo(1.5);
    // Face centre (960, 540) maps to (960, 360): 540 + 1.5*0 + y = 360
    expect(f.x).toBeCloseTo(0);
    expect(f.y).toBeCloseTo(-180);
  });

  it('caps zoom at maxZoom', () => {
    const f = computeFraming(faceAt(960, 540, 50), stage, { ...config, maxZoom: 1.2 });
    expect(f.scale).toBeCloseTo(1.2);
  });

  it('does not zoom out below the full frame for a big face', () => {
    const f = computeFraming(faceAt(960, 400, 600), stage, config);
    expect(f.scale).toBe(1);
    expect(f.x).toBe(0);
    expect(f.y).toBe(0);
  });

  it('pans towards a face on the left, clamped to the picture edge', () => {
    const f = computeFraming(faceAt(300, 540, 200), stage, config);
    // Wanted +990, but at 1.5x the picture only has 480 of spare room per side
    expect(f.x).toBeCloseTo(480);
  });

  it('pans towards a face on the right', () => {
    const f = computeFraming(faceAt(1400, 540, 200), stage, config);
    expect(f.x).toBeCloseTo(-480);
  });

  it('keeps the current framing when the change is inside the dead zone', () => {
    const current = computeFraming(faceAt(1200, 540, 200), stage, config);
    const nudged = computeFraming(faceAt(1210, 545, 200), stage, config, current);
    expect(nudged).toBe(current);
  });

  it('moves once the change leaves the dead zone', () => {
    const current = computeFraming(faceAt(1200, 540, 200), stage, config);
    const moved = computeFraming(faceAt(900, 540, 200), stage, config, current);
    expect(moved).not.toBe(current);
  });

  it('stays at identity for a well framed large face', () => {
    expect(computeFraming(faceAt(960, 360, 330), stage, config, IDENTITY_FRAMING)).toBe(
      IDENTITY_FRAMING
    );
  });
});
