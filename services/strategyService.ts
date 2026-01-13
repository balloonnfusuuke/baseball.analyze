import { 
  GameState, 
  InningZone, 
  ScoreDiff, 
  RunnerState, 
  PlayLog, 
  ActionType, 
  ResultType,
  StrategyStat
} from '../types';
import { INITIAL_RE_MATRIX, RISK_PENALTIES } from '../constants';
import { GoogleGenAI } from "@google/genai";

export const getInningZone = (inning: number): InningZone => {
  if (inning <= 3) return InningZone.EARLY;
  if (inning <= 6) return InningZone.MIDDLE;
  return InningZone.LATE;
};

export const generateStateId = (state: GameState): string => {
  const zone = getInningZone(state.inning);
  // Include Count in State ID: Zone_Diff_Outs_Runners_Balls-Strikes
  return `${zone}_${state.scoreDiff}_${state.outs}_${state.runners}_${state.balls}-${state.strikes}`;
};

export const getRunExpectancy = (outs: number, runners: RunnerState): number => {
  const key = `${outs}_${runners}`;
  return INITIAL_RE_MATRIX[key] ?? 0;
};

export const calculatePEV = (
  runsScored: number,
  currentRE: number,
  nextOuts: number,
  nextRunners: RunnerState,
  resultType: ResultType
): number => {
  const nextRE = getRunExpectancy(nextOuts, nextRunners);
  
  let riskAdjustment = 0;
  // Simple heuristic for risk based on result type, 
  // ideally this checks if the result *was* a double play, but we simplify based on type.
  // In a real app, "isDoublePlay" would be an input boolean.
  if (resultType === ResultType.STRIKEOUT) riskAdjustment += RISK_PENALTIES.STRIKEOUT;
  if (resultType === ResultType.ERROR) riskAdjustment += RISK_PENALTIES.ERROR_INDUCED;

  // Basic Formula: PEV = Runs + (NextRE - CurrentRE) - Risk
  return runsScored + (nextRE - currentRE) - riskAdjustment;
};

// Aggregates logs to find best strategies for a specific State ID
export const analyzeStrategies = (stateId: string, logs: PlayLog[]): StrategyStat[] => {
  const relevantLogs = logs.filter(log => log.stateId === stateId);
  
  const map = new Map<ActionType, { totalPEV: number; count: number; successCount: number }>();

  relevantLogs.forEach(log => {
    const current = map.get(log.action) || { totalPEV: 0, count: 0, successCount: 0 };
    current.totalPEV += log.pev;
    current.count += 1;
    if (log.pev > 0) current.successCount += 1;
    map.set(log.action, current);
  });

  const stats: StrategyStat[] = [];
  map.forEach((val, key) => {
    stats.push({
      action: key,
      count: val.count,
      avgPEV: val.totalPEV / val.count,
      successRate: val.successCount / val.count
    });
  });

  return stats.sort((a, b) => b.avgPEV - a.avgPEV);
};

// Gemini AI Analysis
export const getAiAnalysis = async (
  gameState: GameState, 
  stats: StrategyStat[]
): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  const stateDesc = `
    Inning: ${gameState.inning} (${getInningZone(gameState.inning)})
    Score Diff: ${gameState.scoreDiff}
    Outs: ${gameState.outs}
    Runners: ${gameState.runners}
    Count: ${gameState.balls} Balls, ${gameState.strikes} Strikes
  `;

  const statsDesc = stats.map(s => 
    `- Action: ${s.action}, Avg PEV: ${s.avgPEV.toFixed(3)}, Samples: ${s.count}`
  ).join('\n');

  const prompt = `
    You are the strategic AI coach for the Wakayama Waves independent league baseball team.
    Current Situation:
    ${stateDesc}

    Historical Data for this specific situation (Count included):
    ${statsDesc}

    Based on independent league tendencies (aggressive baserunning, variable defense) and the Run Expectancy data, provide a concise strategic recommendation in Japanese (under 200 characters). 
    Consider the Ball/Strike count heavily in your advice (e.g., 3-0 "Green Light" vs 0-2 "Protect").
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "解析できませんでした。";
  } catch (e) {
    console.error(e);
    return "AI解析中にエラーが発生しました。";
  }
};