
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
import { INITIAL_RE_MATRIX, COUNT_RE_ADJUSTMENTS, RISK_PENALTIES } from '../constants';
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

// Updated to accept count
export const getRunExpectancy = (
  outs: number, 
  runners: RunnerState, 
  balls: number = 0, 
  strikes: number = 0
): number => {
  // If 3 outs, RE is 0 regardless of count
  if (outs >= 3) return 0;

  const baseKey = `${outs}_${runners}`;
  const baseRE = INITIAL_RE_MATRIX[baseKey] ?? 0;
  
  // Apply count adjustment
  const countKey = `${balls}-${strikes}`;
  const adjustment = COUNT_RE_ADJUSTMENTS[countKey] ?? 0;

  // Ensure RE doesn't go below 0
  return Math.max(0, baseRE + adjustment);
};

export const calculatePEV = (
  runsScored: number,
  currentRE: number,
  nextOuts: number,
  nextRunners: RunnerState,
  resultType: ResultType,
  nextBalls: number = 0,
  nextStrikes: number = 0
): number => {
  // Determine Next RE based on Next Outs, Next Runners AND Next Count
  // If the AB ended (e.g. Hit/Out), the next count for the NEW batter starts at 0-0.
  // BUT:
  // - If it was a pitch event (Ball, Foul), the AB continues with the new count.
  // - If it was a generic "Result" (Grounder), the AB is over.
  
  const isAbOver = [
    ResultType.GROUNDER, ResultType.FLY, ResultType.LINER, 
    ResultType.WALK, ResultType.STRIKEOUT, ResultType.ERROR, ResultType.HIT
  ].includes(resultType);

  let effectiveNextBalls = nextBalls;
  let effectiveNextStrikes = nextStrikes;

  if (isAbOver) {
    // If AB is over, the "next state" RE is for a fresh batter (0-0)
    effectiveNextBalls = 0;
    effectiveNextStrikes = 0;
  }

  const nextRE = getRunExpectancy(nextOuts, nextRunners, effectiveNextBalls, effectiveNextStrikes);
  
  let riskAdjustment = 0;
  // Risk penalties
  // Note: Since we now penalize strikes via RE reduction (e.g. 0-0 -> 0-1 drops RE),
  // we can reduce the explicit STRIKEOUT penalty, or keep it as a "failure to put in play" penalty.
  if (resultType === ResultType.STRIKEOUT) riskAdjustment += RISK_PENALTIES.STRIKEOUT;
  if (resultType === ResultType.ERROR) riskAdjustment += RISK_PENALTIES.ERROR_INDUCED;

  // Basic Formula: PEV = Runs + (NextRE - CurrentRE) - Risk
  return runsScored + (nextRE - currentRE) - riskAdjustment;
};

// Aggregates logs to find best strategies for a specific State ID
export const analyzeStrategies = (stateId: string, logs: PlayLog[]): StrategyStat[] => {
  const relevantLogs = logs.filter(log => log.stateId === stateId);
  
  const map = new Map<ActionType, { totalPEV: number; count: number; successCount: number; totalPitches: number }>();

  relevantLogs.forEach(log => {
    const current = map.get(log.action) || { totalPEV: 0, count: 0, successCount: 0, totalPitches: 0 };
    current.totalPEV += log.pev;
    current.count += 1;
    if (log.pev > 0) current.successCount += 1;
    // Assume pitchCount 1 if undefined for backward compatibility or default
    current.totalPitches += (log.pitchCount || 1);
    map.set(log.action, current);
  });

  const stats: StrategyStat[] = [];
  map.forEach((val, key) => {
    stats.push({
      action: key,
      count: val.count,
      avgPEV: val.totalPEV / val.count,
      successRate: val.successCount / val.count,
      avgPitches: val.totalPitches / val.count
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

  // Calculate total samples to instruct AI on confidence level
  const totalSamples = stats.reduce((sum, s) => sum + s.count, 0);

  const statsDesc = stats.map(s => 
    `- Action: ${s.action}, Avg PEV: ${s.avgPEV.toFixed(3)}, Avg Pitches: ${s.avgPitches?.toFixed(1) || 'N/A'}, Samples: ${s.count}`
  ).join('\n');

  const prompt = `
    You are the strategic AI coach for the Wakayama Waves independent league baseball team.
    
    Current Situation:
    ${stateDesc}

    Historical Data (Team's actual results in this situation):
    ${statsDesc}
    Total Samples: ${totalSamples}

    Task:
    Provide a concise strategic recommendation in Japanese (under 200 characters).
    
    Guidelines:
    1. If Total Samples is low (under 5), rely more on general baseball theory (Run Expectancy, Count theory) but mention the lack of data.
    2. If Total Samples is high (over 10), rely heavily on the Historical Data. If a specific Action has high Avg PEV, recommend it strongly as a "Team Trend".
    3. Always consider the Ball/Strike count (e.g., 3-0 "Green Light" vs 0-2 "Protect").
    4. Focus on PEV (Player Evaluation Value) as the primary metric of success.
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
