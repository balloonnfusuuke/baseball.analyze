
import { REMatrix, RunnerState } from './types';

// Standard NPB/Independent League approximated RE Matrix (Base-Out Run Expectancy)
// Key format: `${outs}_${runners}`
export const INITIAL_RE_MATRIX: REMatrix = {
  [`0_${RunnerState.NONE}`]: 0.48,
  [`0_${RunnerState.FIRST}`]: 0.85,
  [`0_${RunnerState.SECOND}`]: 1.07,
  [`0_${RunnerState.THIRD}`]: 1.30,
  [`0_${RunnerState.FIRST_SECOND}`]: 1.46,
  [`0_${RunnerState.FIRST_THIRD}`]: 1.70,
  [`0_${RunnerState.SECOND_THIRD}`]: 1.90,
  [`0_${RunnerState.FULL}`]: 2.25,

  [`1_${RunnerState.NONE}`]: 0.26,
  [`1_${RunnerState.FIRST}`]: 0.51,
  [`1_${RunnerState.SECOND}`]: 0.67,
  [`1_${RunnerState.THIRD}`]: 0.90,
  [`1_${RunnerState.FIRST_SECOND}`]: 0.90,
  [`1_${RunnerState.FIRST_THIRD}`]: 1.15,
  [`1_${RunnerState.SECOND_THIRD}`]: 1.35,
  [`1_${RunnerState.FULL}`]: 1.54,

  [`2_${RunnerState.NONE}`]: 0.10,
  [`2_${RunnerState.FIRST}`]: 0.22,
  [`2_${RunnerState.SECOND}`]: 0.32,
  [`2_${RunnerState.THIRD}`]: 0.36,
  [`2_${RunnerState.FIRST_SECOND}`]: 0.44,
  [`2_${RunnerState.FIRST_THIRD}`]: 0.50,
  [`2_${RunnerState.SECOND_THIRD}`]: 0.58,
  [`2_${RunnerState.FULL}`]: 0.75,
  
  // 3 outs is always 0
  [`3_${RunnerState.NONE}`]: 0,
  [`3_${RunnerState.FIRST}`]: 0,
  [`3_${RunnerState.SECOND}`]: 0,
  [`3_${RunnerState.THIRD}`]: 0,
  [`3_${RunnerState.FIRST_SECOND}`]: 0,
  [`3_${RunnerState.FIRST_THIRD}`]: 0,
  [`3_${RunnerState.SECOND_THIRD}`]: 0,
  [`3_${RunnerState.FULL}`]: 0,
};

// Adjustments to RE based on Ball-Strike count.
// Positive means batter advantage (RE increases), Negative means pitcher advantage.
// Based on typical sabermetric weights (e.g., TangoTiger RE24 Count values).
export const COUNT_RE_ADJUSTMENTS: Record<string, number> = {
  '0-0': 0.00,
  '1-0': 0.03,
  '2-0': 0.09,
  '3-0': 0.20, // Huge advantage
  '0-1': -0.04,
  '1-1': -0.02,
  '2-1': 0.03,
  '3-1': 0.13,
  '0-2': -0.10, // Big disadvantage
  '1-2': -0.08,
  '2-2': -0.03,
  '3-2': 0.06,  // Full count is slightly batter favored vs 0-0 due to walk chance
};

export const RISK_PENALTIES = {
  DOUBLE_PLAY: -0.50, // Massive penalty for momentum killing
  STRIKEOUT: -0.15, // Baseline
  STRIKEOUT_LOOKING: -0.25, // Heavier penalty for passivity
  ERROR_INDUCED: 0.30,
};

export const MOCK_HISTORY = [
    { action: '強攻', pev: 0.38, runs: 0 },
    { action: '待球', pev: 0.03, runs: 0 }, // Taking a ball
];
