import { describe, it, expect } from 'vitest';
import { getHeartRateZone } from '../../utils/heartRateZone';

describe('getHeartRateZone', () => {
  describe('with the default maxHeartRate of 185', () => {
    const maxHeartRate = 185;

    it.each([
      [92, 'resting'],
      [93, 'normal'],
      [110, 'normal'],
      [111, 'active'],
      [129, 'active'],
      [130, 'exercise'],
      [147, 'exercise'],
      [148, 'intense'],
      [166, 'intense'],
      [167, 'maximum'],
    ] as const)('maps %i BPM to %s', (bpm, zone) => {
      expect(getHeartRateZone(bpm, maxHeartRate)).toBe(zone);
    });
  });

  describe('with a maxHeartRate of 200', () => {
    const maxHeartRate = 200;

    it.each([
      [99, 'resting'],
      [100, 'normal'],
      [119, 'normal'],
      [120, 'active'],
      [139, 'active'],
      [140, 'exercise'],
      [159, 'exercise'],
      [160, 'intense'],
      [179, 'intense'],
      [180, 'maximum'],
    ] as const)('maps %i BPM to %s', (bpm, zone) => {
      expect(getHeartRateZone(bpm, maxHeartRate)).toBe(zone);
    });
  });
});
