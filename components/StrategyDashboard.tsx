import React, { useEffect, useState, useMemo } from 'react';
import { PlayLog, StrategyStat, GameState } from '../types';
import { analyzeStrategies, generateStateId, getAiAnalysis } from '../services/strategyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Sparkles, Filter, TrendingUp, Activity, Target, Zap, BrainCircuit, Info, X, Calculator } from 'lucide-react';

interface Props {
  currentState: GameState;
  logs: PlayLog[];
}

// Data shape for the Pitch Volume Analysis
interface InningVolumeStat {
  category: string; // "早打ち(<15)", "標準(15-24)", "粘り(25+)"
  avgRuns: number;  // Average runs scored in this category
  count: number;    // Number of innings in this category
  totalPitches: number;
  fullLabel: string;
}

const StrategyDashboard: React.FC<Props> = ({ currentState, logs }) => {
  const [stats, setStats] = useState<StrategyStat[]>([]);
  const [volumeStats, setVolumeStats] = useState<InningVolumeStat[]>([]);
  const [aiRec, setAiRec] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [scope, setScope] = useState<'ALL' | 'TEAM'>('TEAM');
  const [showPevInfo, setShowPevInfo] = useState(false);

  // 1. Filter logs based on scope (Team vs All)
  const filteredLogs = useMemo(() => {
    if (scope === 'ALL') return logs;
    if (!currentState.offenseTeam) return logs;
    return logs.filter(log => log.offenseTeam === currentState.offenseTeam);
  }, [logs, scope, currentState.offenseTeam]);

  // 2. Analyze Specific Situation (Top Chart)
  useEffect(() => {
    const id = generateStateId(currentState);
    const calculatedStats = analyzeStrategies(id, filteredLogs);
    setStats(calculatedStats);
    setAiRec(""); 
  }, [currentState, filteredLogs]);

  // 3. Analyze Pitch Volume vs Runs & Summary Metrics
  useEffect(() => {
    // Map to group logs by unique inning
    const inningMap = new Map<string, { totalPitches: number; totalRuns: number }>();

    filteredLogs.forEach(log => {
        const key = `${log.date}_${log.gameState.inning}_${log.gameState.topBottom}_${log.offenseTeam}`;
        const current = inningMap.get(key) || { totalPitches: 0, totalRuns: 0 };
        current.totalPitches += (log.pitchCount || 1);
        current.totalRuns += log.runsScored;
        inningMap.set(key, current);
    });

    const bins = {
        aggressive: { name: '早打ち (<15球)', count: 0, sumRuns: 0, sumPitches: 0 },
        balanced:   { name: '標準 (15-24球)', count: 0, sumRuns: 0, sumPitches: 0 },
        patient:    { name: '粘り (25球+)',   count: 0, sumRuns: 0, sumPitches: 0 },
    };

    inningMap.forEach(val => {
        if (val.totalPitches < 15) {
            bins.aggressive.count++;
            bins.aggressive.sumRuns += val.totalRuns;
            bins.aggressive.sumPitches += val.totalPitches;
        } else if (val.totalPitches < 25) {
            bins.balanced.count++;
            bins.balanced.sumRuns += val.totalRuns;
            bins.balanced.sumPitches += val.totalPitches;
        } else {
            bins.patient.count++;
            bins.patient.sumRuns += val.totalRuns;
            bins.patient.sumPitches += val.totalPitches;
        }
    });

    const result: InningVolumeStat[] = [
        { 
            category: '早打ち', 
            fullLabel: '早打ち (<15球)',
            avgRuns: bins.aggressive.count ? bins.aggressive.sumRuns / bins.aggressive.count : 0, 
            count: bins.aggressive.count,
            totalPitches: bins.aggressive.sumPitches
        },
        { 
            category: '標準', 
            fullLabel: '標準 (15-24球)',
            avgRuns: bins.balanced.count ? bins.balanced.sumRuns / bins.balanced.count : 0, 
            count: bins.balanced.count,
            totalPitches: bins.balanced.sumPitches
        },
        { 
            category: '粘り', 
            fullLabel: '粘り (25球+)',
            avgRuns: bins.patient.count ? bins.patient.sumRuns / bins.patient.count : 0, 
            count: bins.patient.count,
            totalPitches: bins.patient.sumPitches
        },
    ];

    setVolumeStats(result);
  }, [filteredLogs]);

  // --- Summary Metrics Calculations ---
  const totalPEV = useMemo(() => filteredLogs.reduce((sum, log) => sum + log.pev, 0), [filteredLogs]);
  
  const runsPerInning = useMemo(() => {
     const inningSet = new Set(filteredLogs.map(l => `${l.date}-${l.gameState.inning}-${l.gameState.topBottom}`));
     const totalRuns = filteredLogs.reduce((sum, l) => sum + l.runsScored, 0);
     return inningSet.size > 0 ? (totalRuns / inningSet.size) : 0;
  }, [filteredLogs]);

  const strategyDNA = useMemo(() => {
     if (volumeStats.length === 0) return "N/A";
     // Determine which category has the most innings
     const sorted = [...volumeStats].sort((a, b) => b.count - a.count);
     const dominant = sorted[0];
     if (dominant.count === 0) return "データ不足";
     return dominant.category + "型";
  }, [volumeStats]);

  const handleAiAsk = async () => {
    setLoadingAi(true);
    const rec = await getAiAnalysis(currentState, stats);
    setAiRec(rec);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">

      {/* --- PEV INFO MODAL --- */}
      {showPevInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Calculator className="text-blue-400" size={20} />
                        PEV指標の解説
                    </h3>
                    <button onClick={() => setShowPevInfo(false)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div>
                        <h4 className="font-bold text-slate-900 mb-1 border-b pb-1">PEV (Player Evaluation Value) とは？</h4>
                        <p>
                            「そのプレーがどれだけ得点期待値を高めたか」を示す、チーム独自の貢献度指標です。
                            打率や防御率といった「結果」だけでなく、<span className="font-bold text-blue-600">勝利へのプロセスの質</span>を評価するために設計されました。
                        </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-2">計算式</h4>
                        <code className="block bg-white p-2 rounded border border-slate-300 font-mono text-xs mb-2">
                            PEV = 得点 + (直後のRE - 直前のRE) + 戦略調整
                        </code>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                            <li><span className="font-bold">RE (Run Expectancy):</span> 無死一塁なら約0.85点など、その状況から平均何点入るかという確率的期待値。</li>
                            <li><span className="font-bold">戦略調整:</span> 三振(-0.15)などのペナルティ。</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-900 mb-1 border-b pb-1">プロ野球公式指標との関係</h4>
                        <p>
                            PEVのベースとなっているのは、MLBやNPBのセイバーメトリクスで標準的に使われる<span className="font-bold text-indigo-600">「RE24 (Run Expectancy 24)」</span>という指標です。
                        </p>
                        <p className="mt-2 text-xs bg-indigo-50 text-indigo-800 p-2 rounded">
                            <span className="font-bold">違い:</span> 一般的なRE24は「結果（進塁したかどうか）」のみを見ますが、本システムのPEVは「進塁打の意図」や「三振の罪深さ」など、<span className="underline">チーム戦略に基づいた独自の重み付け</span>を加えています。
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t text-center">
                    <button onClick={() => setShowPevInfo(false)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-700">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- STRATEGIC COCKPIT --- */}
      <div className="grid grid-cols-3 gap-3">
         {/* Card 1: Total PEV */}
         <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden group">
             {/* Info Button */}
             <button 
                onClick={() => setShowPevInfo(true)}
                className="absolute top-2 right-2 text-slate-300 hover:text-blue-600 transition-colors z-10 p-1"
                title="PEVとは？"
             >
                 <Info size={16} />
             </button>
             
             <div className="absolute -bottom-4 -right-4 p-2 opacity-5">
                 <Zap size={60} className="text-blue-600" />
             </div>
             
             <div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Zap size={10} /> Total PEV
                 </span>
                 <div className={`text-2xl font-black mt-1 ${totalPEV >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {totalPEV > 0 ? '+' : ''}{totalPEV.toFixed(2)}
                 </div>
             </div>
             <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                累積貢献度
                <span className="text-[8px] bg-slate-100 px-1 rounded border">RE24ベース</span>
             </div>
         </div>

         {/* Card 2: Efficiency */}
         <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute -bottom-4 -right-4 p-2 opacity-5">
                 <Target size={60} className="text-emerald-600" />
             </div>
             <div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Target size={10} /> R / Inning
                 </span>
                 <div className="text-2xl font-black mt-1 text-emerald-600">
                    {runsPerInning.toFixed(2)}
                 </div>
             </div>
             <div className="text-[10px] text-slate-400 mt-1">得点効率</div>
         </div>

         {/* Card 3: DNA */}
         <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute -bottom-4 -right-4 p-2 opacity-5">
                 <BrainCircuit size={60} className="text-purple-600" />
             </div>
             <div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BrainCircuit size={10} /> Style
                 </span>
                 <div className="text-lg font-black mt-2 text-purple-700 leading-none">
                    {strategyDNA}
                 </div>
             </div>
             <div className="text-[10px] text-slate-400 mt-1">戦略傾向</div>
         </div>
      </div>
      
      {/* --- TOP SECTION: SITUATION ANALYSIS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" size={20} />
                    場面別・推奨アクション
                </h2>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setScope('TEAM')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        自チーム
                    </button>
                    <button 
                        onClick={() => setScope('ALL')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        全体平均
                    </button>
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                   <Filter size={12} />
                   <span>状況ID: {generateStateId(currentState)}</span>
                </div>
                <button 
                    onClick={handleAiAsk}
                    disabled={loadingAi}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow hover:opacity-90 transition-opacity"
                >
                    {loadingAi ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    AI Coach
                </button>
            </div>
        </div>

        {aiRec && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900 animate-in fade-in slide-in-from-top-2">
            <div className="font-bold mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              AI Advice:
            </div>
            {aiRec}
          </div>
        )}

        {stats.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p>この状況のデータが不足しています</p>
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="action" 
                  type="category" 
                  width={70} 
                  tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}} 
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                  formatter={(value: number) => [`PEV: ${value.toFixed(3)}`, '貢献度']}
                />
                <Bar dataKey="avgPEV" radius={[0, 4, 4, 0]} barSize={20}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgPEV > 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* --- BOTTOM SECTION: PITCH VOLUME ANALYSIS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="mb-4 border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-amber-500" size={20} />
                戦略分析: 投球数 vs 得点力
            </h2>
            <p className="text-xs text-slate-500 mt-1">
                イニングごとの総投球数（戦略）と平均得点（成果）の相関。
                <br/>「粘ることが勝利に繋がっているか」を検証します。
            </p>
          </div>

          <div className="h-56 w-full mt-4">
             {volumeStats.reduce((sum, s) => sum + s.count, 0) === 0 ? (
                 <div className="flex items-center justify-center h-full text-slate-400 text-sm bg-slate-50 rounded border border-dashed">
                    データ収集中...
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="category" 
                            tick={{fontSize: 12, fontWeight: 'bold', fill: '#475569'}} 
                        />
                        <YAxis 
                            tick={{fontSize: 11, fill: '#94a3b8'}} 
                            label={{ value: '平均得点', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                        />
                        <Tooltip 
                             cursor={{fill: '#fffbeb'}}
                             content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                const data = payload[0].payload as InningVolumeStat;
                                return (
                                    <div className="bg-white p-3 shadow-lg rounded-lg border border-slate-100">
                                    <p className="font-bold text-slate-800 mb-1">{data.fullLabel}</p>
                                    <div className="space-y-1 text-xs">
                                        <p className="text-amber-600 font-bold">平均得点: {data.avgRuns.toFixed(2)}点</p>
                                        <p className="text-slate-500">サンプル数: {data.count}回</p>
                                        <p className="text-slate-400">総投球数: {data.totalPitches}球</p>
                                    </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="avgRuns" radius={[4, 4, 0, 0]} barSize={40}>
                            {volumeStats.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={
                                        index === 0 ? '#94a3b8' : // Aggressive (Grey)
                                        index === 1 ? '#60a5fa' : // Balanced (Blue)
                                        '#f59e0b'                 // Patient (Amber)
                                    } 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             )}
          </div>
          
          {/* Summary Text */}
          <div className="mt-3 bg-slate-50 p-3 rounded text-xs text-slate-600 border border-slate-100 flex gap-4 justify-between">
              {volumeStats.map((stat, i) => (
                  <div key={i} className="text-center flex-1">
                      <div className="font-bold text-slate-700 mb-0.5">{stat.category}</div>
                      <div className={`text-lg font-black ${i===2 ? 'text-amber-500' : 'text-slate-500'}`}>
                          {stat.avgRuns.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">点/回</div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default StrategyDashboard;