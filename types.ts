
export enum InningZone {
  EARLY = '序盤', // 1-3
  MIDDLE = '中盤', // 4-6
  LATE = '終盤', // 7-9+
}

export enum ScoreDiff {
  WIN_BIG = '+3以上',
  WIN_SMALL = '+1〜2',
  TIE = '同点',
  LOSE_SMALL = '-1〜2',
  LOSE_BIG = '-3以下',
}

export enum RunnerState {
  NONE = '000',
  FIRST = '100',
  SECOND = '020',
  THIRD = '003',
  FIRST_SECOND = '120',
  FIRST_THIRD = '103',
  SECOND_THIRD = '023',
  FULL = '123',
}

export enum ActionType {
  ATTACK = '強攻',
  BUNT_SAC = '送りバント',
  BUNT_SAFETY = 'セーフティ',
  END_RUN = 'エンドラン',
  HIT_END_RUN = 'ヒットエンドラン',
  STEAL = '盗塁',
  WAIT = '待球',
}

export enum ResultType {
  // Batted / Finished Events
  GROUNDER = '内野ゴロ',
  FLY = '外野フライ',
  LINER = 'ライナー',
  WALK = '四球', // Ball 4
  STRIKEOUT = '三振', // Strike 3
  ERROR = '失策',
  HIT = '安打',
  
  // Pitch Events (Continuing AB)
  TAKE_BALL = 'ボール(見送)',
  TAKE_STRIKE = 'ストライク(見送)',
  SWING_STRIKE = '空振り',
  FOUL = 'ファウル',
}

export interface GameState {
  inning: number;
  topBottom: '表' | '裏';
  outs: 0 | 1 | 2;
  runners: RunnerState;
  scoreDiff: ScoreDiff;
  opponent: string; // Legacy/Display purpose
  offenseTeam?: string;
  defenseTeam?: string;
  balls: 0 | 1 | 2 | 3;
  strikes: 0 | 1 | 2;
}

export interface PlayLog {
  id: string;
  date: string;
  stateId: string;
  gameState: GameState;
  action: ActionType;
  resultType: ResultType;
  runsScored: number;
  
  // Next State
  nextOuts: 0 | 1 | 2 | 3;
  nextRunners: RunnerState;
  nextBalls: 0 | 1 | 2 | 3; // Added
  nextStrikes: 0 | 1 | 2;   // Added

  pitchCount?: number; // Total pitches in this AB (optional, for bulletin mode)

  currentRE: number;
  nextRE: number;
  pev: number; // Player Evaluation Value
  offenseTeam?: string;
  defenseTeam?: string;
}

export interface StrategyStat {
  action: ActionType;
  count: number;
  avgPEV: number;
  successRate: number; // Simplified concept of "success" (e.g., positive PEV or advance)
  avgPitches?: number; // Added tracking for stickiness
}

// Map key: "Outs_Runners" (e.g., "0_100") -> Value: Expected Runs
export type REMatrix = Record<string, number>;
