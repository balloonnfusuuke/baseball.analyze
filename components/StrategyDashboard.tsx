import React, { useEffect, useState } from 'react';
import { PlayLog, StrategyStat, GameState } from '../types';
import { analyzeStrategies, generateStateId, getAiAnalysis } from '../services/strategyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  currentState: GameState;
  logs: PlayLog[];
}

const StrategyDashboard: React.FC<Props> = ({ currentState, logs }) => {
  const [stats, setStats] = useState<StrategyStat[]>([]);
  const [aiRec, setAiRec] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const id = generateStateId(currentState);
    const calculatedStats = analyzeStrategies(id, logs);
    setStats(calculatedStats);
    setAiRec(""); // Reset AI on state change
  }, [currentState, logs]);

  const handleAiAsk = async () => {
    setLoadingAi(true);
    const rec = await getAiAnalysis(currentState, stats);
    setAiRec(rec);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">推奨戦略 (PEV順)</h2>
          <button 
            onClick={handleAiAsk}
            disabled={loadingAi}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow hover:opacity-90 transition-opacity"
          >
            {loadingAi ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            AI Coach
          </button>
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
          <div className="text-center py-8 text-slate-400 text-sm">
            データ不足のため推奨なし<br/>（リーグ平均を使用）
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
                        <div className="text-xs text-slate-400">{stat.count} samples</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StrategyDashboard;