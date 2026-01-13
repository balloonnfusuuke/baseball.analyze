import { REMatrix, RunnerState } from './types';

// Standard NPB/Independent League approximated RE Matrix (Base-Out Run Expectancy)
// Key format: `${outs}_${runners}`
// Runners are represented by RunnerState enum strings (e.g., "100" for 1st base)
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

export const RISK_PENALTIES = {
  DOUBLE_PLAY: -0.5,
  STRIKEOUT: -0.2,
  ERROR_INDUCED: 0.3, // Bonus
};

export const MOCK_HISTORY = [
    // Pre-populating some data for visualization
    { action: '強攻', pev: 0.38, runs: 0 },
    { action: '強攻', pev: -0.1, runs: 0 },
    { action: '送りバント', pev: -0.12, runs: 0 },
    { action: '盗塁', pev: 0.5, runs: 1 },
];