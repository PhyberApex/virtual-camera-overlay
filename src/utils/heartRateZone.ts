export type HeartRateZone = 'resting' | 'normal' | 'active' | 'exercise' | 'intense' | 'maximum';

const ZONE_PERCENTAGES: Array<{ zone: HeartRateZone; percentage: number }> = [
  { zone: 'maximum', percentage: 0.9 },
  { zone: 'intense', percentage: 0.8 },
  { zone: 'exercise', percentage: 0.7 },
  { zone: 'active', percentage: 0.6 },
  { zone: 'normal', percentage: 0.5 },
];

export const getHeartRateZone = (bpm: number, maxHeartRate: number): HeartRateZone => {
  for (const { zone, percentage } of ZONE_PERCENTAGES) {
    if (bpm >= Math.round(percentage * maxHeartRate)) {
      return zone;
    }
  }
  return 'resting';
};
