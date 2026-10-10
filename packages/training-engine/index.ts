export type LoadUnit = 'kg' | 'lb';
export type LoggedSet = { id: string; load: number; reps: number; rir: number | null };
export type ProgressionInput = {
  sets: LoggedSet[]; targetSets: number; repMin: number; repMax: number;
  unit: LoadUnit; techniqueConfirmed: boolean; safetyFlag: boolean;
};
export type Recommendation = {
  action: 'hold' | 'consider_increase' | 'stop_and_assess';
  reason_codes: string[]; evidence: { completedSets: number; targetSets: number };
  algorithm_version: string; uncertainty: 'low' | 'high'; explanation: string;
  limitations: string[]; suggestedLoad?: number; unit: LoadUnit;
};
export const defaultThresholds = { minimumRir: 1, incrementKg: 2.5, incrementLb: 5 };

export function convertLoad(value: number, from: LoadUnit, to: LoadUnit): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Load must be finite and non-negative.');
  return from === to ? value : from === 'kg' ? value * 2.2046226218 : value / 2.2046226218;
}

export function recommendProgression(input: ProgressionInput, thresholds = defaultThresholds): Recommendation {
  const base: Recommendation = {
    action: 'hold', reason_codes: [],
    evidence: { completedSets: input.sets.length, targetSets: input.targetSets },
    algorithm_version: 'double-progression/1.0.0', uncertainty: 'high', unit: input.unit,
    explanation: 'Repeat this load and build consistent reps.',
    limitations: ['Product heuristics, not universal training rules.', 'RIR is subjective; technique requires your confirmation.'],
  };
  if (input.safetyFlag) return { ...base, action: 'stop_and_assess', reason_codes: ['safety_flag'], explanation: 'Pause progression for pain, discomfort or dizziness. Consider appropriate professional assessment.' };
  const invalid = !Number.isInteger(input.targetSets) || input.targetSets < 1 || input.targetSets > 10 ||
    !Number.isInteger(input.repMin) || !Number.isInteger(input.repMax) || input.repMin < 1 || input.repMax < input.repMin || input.repMax > 100 ||
    !Number.isFinite(thresholds.minimumRir) || thresholds.minimumRir < 0 || thresholds.minimumRir > 10 ||
    !Number.isFinite(thresholds.incrementKg) || thresholds.incrementKg <= 0 || !Number.isFinite(thresholds.incrementLb) || thresholds.incrementLb <= 0 ||
    new Set(input.sets.map(s => s.id)).size !== input.sets.length || input.sets.some(s =>
      !Number.isFinite(s.load) || s.load < 0 || s.load > 1000 || !Number.isInteger(s.reps) || s.reps < 1 || s.reps > 100 ||
      (s.rir !== null && (!Number.isFinite(s.rir) || s.rir < 0 || s.rir > 10)));
  if (invalid) return { ...base, reason_codes: ['invalid_or_duplicate_data'], explanation: 'Check the recorded values before considering progression.' };
  if (input.sets.length !== input.targetSets) return { ...base, reason_codes: ['incomplete_or_extra_sets'] };
  const load = input.sets[0].load;
  if (input.sets.some(s => s.load !== load)) return { ...base, reason_codes: ['mixed_loads'], explanation: 'These sets use different loads; repeat a comparable session before increasing.' };
  if (input.sets.some(s => s.reps < input.repMax)) return { ...base, reason_codes: ['rep_target_not_met'] };
  if (!input.techniqueConfirmed) return { ...base, reason_codes: ['technique_unconfirmed'], explanation: 'Top reps reached. Confirm comfortable technique before considering a load increase.' };
  if (input.sets.some(s => s.rir === null)) return { ...base, reason_codes: ['effort_unknown'], explanation: 'Top reps reached, but effort is unknown. Repeat or assess comfortable effort before increasing.' };
  if (input.sets.some(s => s.rir! < thresholds.minimumRir)) return { ...base, reason_codes: ['effort_too_high'], explanation: 'Top reps reached with high reported effort. Repeat the load.' };
  if (load === 0) return { ...base, reason_codes: ['bodyweight_or_unloaded'], explanation: 'For unloaded movements, progress reps or difficulty deliberately.' };
  return { ...base, action: 'consider_increase', uncertainty: 'low', reason_codes: ['top_reps_all_sets', 'effort_acceptable', 'technique_confirmed'],
    suggestedLoad: load + (input.unit === 'kg' ? thresholds.incrementKg : thresholds.incrementLb),
    explanation: 'All prescribed sets reached top reps with acceptable reported effort and confirmed technique. Consider a small increase next time if comfortable.' };
}
