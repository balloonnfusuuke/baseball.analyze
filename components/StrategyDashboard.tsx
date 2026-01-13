
import React, { useEffect, useState, useMemo } from 'react';
import { PlayLog, StrategyStat, GameState } from '../types';
import { analyzeStrategies, generateStateId, getAiAnalysis } from '../services/strategyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Sparkles, Filter } from 'lucide-react';

interface Props {
  currentState: GameState;
  logs: PlayLog[];
}

const StrategyDashboard: React.FC<Props> = ({ currentState, logs }) => {
  const [stats, setStats] = useState<StrategyStat[]>([]);
  const [aiRec, setAiRec] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [scope, setScope] = useState<'ALL' | 'TEAM'>('TEAM');

  // Filter logs based on scope
  const filteredLogs = useMemo(() => {
    if (scope === 'ALL') return logs;
    // Filter by the current offense team
    // If currentState.offenseTeam is undefined (shouldn't be in new app, but maybe legacy), fallback to ALL
    if (!currentState.offenseTeam) return logs;
    
    return logs.filter(log => log.offenseTeam === currentState.offenseTeam);
  }, [logs, scope, currentState.offenseTeam]);

  useEffect(() => {
    const id = generateStateId(currentState);
    const calculatedStats = analyzeStrategies(id, filteredLogs);
    setStats(calculatedStats);
    setAiRec(""); // Reset AI on state change
  }, [currentState, filteredLogs]);

  const handleAiAsk = async () => {
    setLoadingAi(true);
    const rec = await getAiAnalysis(currentState, stats);
    setAiRec(rec);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">推奨戦略</h2>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setScope('TEAM')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {currentState.offenseTeam ? `${currentState.offenseTeam}` : '自チーム'}
                    </button>
                    <button 
                        onClick={() => setScope('ALL')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${scope === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        全チーム平均
                    </button>
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                   <Filter size={12} />
                   <span>対象: {filteredLogs.length}件のデータ ({generateStateId(currentState)})</span>
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
          <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p>この状況のデータがありません</p>
            <p className="text-xs mt-1">「全チーム平均」に切り替えるか、似た状況を参考にしてください</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="action" 
                  type="category" 
                  width={80} 
                  tick={{fontSize: 12, fill: '#64748b'}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => value.toFixed(3)}
                />
                <Bar dataKey="avgPEV" radius={[0, 4, 4, 0]} barSize={24}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgPEV > 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 space-y-2">
            {stats.slice(0, 3).map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0">
                    <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-400' : 'bg-slate-300'}`}>
                            {idx + 1}
                        </span>
                        <span className="font-medium text-slate-700">{stat.action}</span>
                    </span>
                    <div className="text-right">
                        <div className={`font-mono font-bold ${stat.avgPEV > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            {stat.avgPEV > 0 ? '+' : ''}{stat.avgPEV.toFixed(3)}
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-400 justify-end">
                            <span>{stat.count}件</span>
                            {stat.avgPitches && (
                                <span className="font-bold text-slate-500 bg-slate-100 px-1 rounded">
                                    {stat.avgPitches.toFixed(1)}球/打席
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StrategyDashboard;
