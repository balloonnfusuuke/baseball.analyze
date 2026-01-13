
import React, { useState, useEffect } from 'react';
import { 
  GameState, 
  RunnerState, 
  ScoreDiff, 
  ActionType, 
  ResultType, 
  PlayLog 
} from '../types';
import FieldVisual from './FieldVisual';
import { v4 as uuidv4 } from 'uuid';
import { calculatePEV, generateStateId, getRunExpectancy } from '../services/strategyService';
import StrategyDashboard from './StrategyDashboard';
import { Plus, X, RotateCcw } from 'lucide-react';

interface Props {
  onLogSave: (log: PlayLog) => void;
  history: PlayLog[];
}

const GameInput: React.FC<Props> = ({ onLogSave, history }) => {
  // --- UI State ---
  // 0: Situation Input (Strategy View), 1: Action/Result Input (Logging)
  const [step, setStep] = useState<0 | 1>(0);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teams, setTeams] = useState<string[]>([]);

  // --- Game Data State ---
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('堺シュライクス');
  const [inning, setInning] = useState(1);
  const [topBottom, setTopBottom] = useState<'表' | '裏'>('表');
  
  // Situation
  const [outs, setOuts] = useState<0 | 1 | 2>(0);
  const [runners, setRunners] = useState<RunnerState>(RunnerState.NONE);
  const [scoreDiff, setScoreDiff] = useState<ScoreDiff>(ScoreDiff.TIE);
  // Count
  const [balls, setBalls] = useState<0 | 1 | 2 | 3>(0);
  const [strikes, setStrikes] = useState<0 | 1 | 2>(0);

  // Action & Result (Step 1)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [resultType, setResultType] = useState<ResultType>(ResultType.GROUNDER);
  const [runsScored, setRunsScored] = useState(0);
  const [nextOuts, setNextOuts] = useState<0 | 1 | 2 | 3>(0);
  const [nextRunners, setNextRunners] = useState<RunnerState>(RunnerState.NONE);

  const currentState: GameState = { 
    inning, 
    topBottom, 
    outs, 
    runners, 
    scoreDiff, 
    opponent,
    balls,
    strikes
  };

  // Load Teams
  useEffect(() => {
    const savedTeams = localStorage.getItem('waves_teams');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    } else {
      const defaults = ['堺シュライクス', '淡路島ウォリアーズ', '姫路イーグレッターズ', '兵庫ブレイバーズ', '大阪ゼロロクブルズ'];
      setTeams(defaults);
      localStorage.setItem('waves_teams', JSON.stringify(defaults));
    }
  }, []);

  // --- Handlers ---

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    if (teams.includes(newTeamName)) {
      alert('既に存在するチーム名です');
      return;
    }
    const updated = [...teams, newTeamName];
    setTeams(updated);
    setOpponent(newTeamName);
    localStorage.setItem('waves_teams', JSON.stringify(updated));
    setNewTeamName('');
    setShowTeamModal(false);
  };

  const handleNextInning = () => {
      setInning(p => p < 9 ? p + 1 : p);
      setOuts(0);
      setRunners(RunnerState.NONE);
      setBalls(0);
      setStrikes(0);
  }

  const handleSituationSubmit = () => {
    // Move to Result Entry
    // Initialize "Next State" defaults based on current state (heuristic)
    setNextOuts(outs); 
    setNextRunners(runners);
    setStep(1);
  };

  const handleLogSubmit = () => {
    if (!selectedAction) return;

    const currentRE = getRunExpectancy(outs, runners);
    const nextRE = nextOuts === 3 ? 0 : getRunExpectancy(nextOuts, nextRunners); // 3 outs = 0 RE
    
    const pev = calculatePEV(runsScored, currentRE, nextOuts, nextRunners, resultType);

    const log: PlayLog = {
      id: uuidv4(),
      date,
      stateId: generateStateId(currentState),
      gameState: { ...currentState },
      action: selectedAction,
      resultType,
      runsScored,
      nextOuts,
      nextRunners,
      currentRE,
      nextRE,
      pev
    };

    onLogSave(log);
    
    // Reset for next play
    // Automatically set current state to the "next state" of the previous play
    if (nextOuts === 3) {
      setTopBottom(prev => prev === '表' ? '裏' : '表');
      if (topBottom === '裏') handleNextInning();
      else {
          setOuts(0);
          setRunners(RunnerState.NONE);
          setBalls(0);
          setStrikes(0);
      }
    } else {
        setOuts(nextOuts as 0|1|2);
        setRunners(nextRunners);
        // Reset Count for new batter/situation
        setBalls(0);
        setStrikes(0);
    }

    setRunsScored(0);
    setSelectedAction(null);
    setStep(0); // Go back to strategy view
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      {/* Modal for Adding Team */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">新規チーム登録</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <input 
              type="text" 
              placeholder="チーム名を入力" 
              className="w-full border border-slate-300 rounded p-2 mb-4 focus:border-blue-500 outline-none font-bold"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowTeamModal(false)} 
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded"
              >
                キャンセル
              </button>
              <button 
                onClick={handleAddTeam} 
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                disabled={!newTeamName.trim()}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: INPUT */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Header / Game Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-2">
             <input type="date" value={date} readOnly className="text-sm font-bold bg-slate-100 p-1 rounded" />
             <span className="text-slate-400">vs</span>
             <div className="flex items-center gap-1">
               <div className="relative">
                 <select 
                   value={opponent} 
                   onChange={e => setOpponent(e.target.value)}
                   className="font-bold border-b border-slate-300 focus:border-blue-500 outline-none w-40 bg-transparent py-1 cursor-pointer appearance-none" 
                 >
                   {teams.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                 </div>
               </div>
               <button 
                 onClick={() => setShowTeamModal(true)} 
                 className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                 title="チームを追加"
               >
                 <Plus size={16} />
               </button>
             </div>
           </div>
           <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setInning(Math.max(1, inning-1))} className="px-3 py-1 text-sm font-bold text-slate-500 hover:bg-white rounded">-</button>
              <span className="font-mono font-bold w-8 text-center">{inning}回</span>
              <button onClick={() => setInning(inning+1)} className="px-3 py-1 text-sm font-bold text-slate-500 hover:bg-white rounded">+</button>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <button onClick={() => setTopBottom('表')} className={`px-3 py-1 text-xs font-bold rounded ${topBottom === '表' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>表</button>
              <button onClick={() => setTopBottom('裏')} className={`px-3 py-1 text-xs font-bold rounded ${topBottom === '裏' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>裏</button>
           </div>
        </div>

        {/* STEP 0: SITUATION INPUT */}
        {step === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-left-4 fade-in">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">状況入力 (BEFORE)</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Phase 1</span>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Field & Outs & Count */}
              <div className="flex flex-col sm:flex-row gap-8 items-start justify-center">
                 {/* Runners */}
                 <div className="flex-1 w-full max-w-xs flex flex-col items-center">
                   <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">Runners</label>
                   <FieldVisual runnerState={runners} onChange={setRunners} />
                 </div>
                 
                 {/* Controls */}
                 <div className="flex-1 space-y-6 w-full max-w-xs">
                    {/* Count */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Count</label>
                      <div className="flex items-center justify-between gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
                        <div className="flex flex-col gap-2">
                            {/* Balls: 3 circles */}
                            <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-500 w-4 text-center">B</span>
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(b => (
                                    <button 
                                    key={b} 
                                    onClick={() => setBalls(b as 0|1|2|3)}
                                    className={`w-5 h-5 rounded-full border-2 transition-all shadow-md ${balls >= b ? 'bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}
                                    title={`Ball ${b}`}
                                    />
                                ))}
                            </div>
                            </div>
                            {/* Strikes: 2 circles */}
                            <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-yellow-400 w-4 text-center">S</span>
                            <div className="flex gap-1.5">
                                {[1, 2].map(s => (
                                    <button 
                                    key={s} 
                                    onClick={() => setStrikes(s as 0|1|2)}
                                    className={`w-5 h-5 rounded-full border-2 transition-all shadow-md ${strikes >= s ? 'bg-yellow-400 border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}
                                    title={`Strike ${s}`}
                                    />
                                ))}
                            </div>
                            </div>
                        </div>
                        
                        {/* Reset Count Button */}
                        <button 
                           onClick={() => { setBalls(0); setStrikes(0); }}
                           className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-full transition-colors"
                           title="カウントリセット"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Outs */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Outs</label>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(o => (
                          <button
                            key={o}
                            onClick={() => setOuts(o as 0|1|2)}
                            className={`flex-1 py-3 rounded-lg font-bold text-xl transition-all ${outs === o ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Score Diff */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Score Diff (Self)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.values(ScoreDiff).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setScoreDiff(diff)}
                            className={`py-2 px-1 text-xs font-bold rounded border ${scoreDiff === diff ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleSituationSubmit}
                className="w-full py-4 bg-slate-800 text-white font-bold rounded-lg shadow-lg hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                結果入力へ進む (Commit Play)
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: RESULT INPUT */}
        {step === 1 && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-right-4 fade-in">
             <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
               <h3 className="font-bold text-blue-900">結果入力 (AFTER)</h3>
               <button onClick={() => setStep(0)} className="text-xs text-blue-600 hover:underline">← 状況に戻る</button>
             </div>

             <div className="p-6 space-y-6">
                {/* Action Selection */}
                <div>
                   <label className="block text-xs font-bold text-slate-400 mb-2">選択した作戦</label>
                   <div className="flex flex-wrap gap-2">
                     {Object.values(ActionType).map(action => (
                       <button
                         key={action}
                         onClick={() => setSelectedAction(action)}
                         className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedAction === action ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                       >
                         {action}
                       </button>
                     ))}
                   </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Result Type & Score */}
                   <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">打撃結果</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium"
                          value={resultType}
                          onChange={(e) => setResultType(e.target.value as ResultType)}
                        >
                          {Object.values(ResultType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">得点 (このプレーで)</label>
                        <div className="flex gap-2">
                           {[0,1,2,3,4].map(r => (
                             <button 
                                key={r} 
                                onClick={() => setRunsScored(r)}
                                className={`w-10 h-10 rounded font-bold ${runsScored === r ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'}`}
                             >{r}</button>
                           ))}
                        </div>
                      </div>
                   </div>

                   {/* Next State */}
                   <div className="space-y-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-400 mb-2">次のアウト数</label>
                         <div className="flex gap-2">
                           {[0,1,2,3].map(o => (
                             <button
                               key={o}
                               onClick={() => setNextOuts(o as 0|1|2|3)}
                               className={`flex-1 py-1 rounded text-sm font-bold ${nextOuts === o ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                             >
                               {o === 3 ? 'チェンジ' : o}
                             </button>
                           ))}
                         </div>
                      </div>
                      {nextOuts !== 3 && (
                        <div>
                           <label className="block text-xs font-bold text-slate-400 mb-2">次の走者</label>
                           <div className="scale-75 origin-top-left">
                               <FieldVisual runnerState={nextRunners} onChange={setNextRunners} />
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                <button 
                  onClick={handleLogSubmit}
                  disabled={!selectedAction}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                >
                  プレーを記録する (Save Log)
                </button>
             </div>
           </div>
        )}
      </div>

      {/* RIGHT COLUMN: DASHBOARD */}
      <div className="lg:col-span-5 space-y-6">
         {/* Strategy Dashboard (Always visible, responsive to current Situation Input) */}
         <StrategyDashboard currentState={currentState} logs={history} />

         {/* History Feed (Mini) */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-[400px] overflow-y-auto">
            <h3 className="font-bold text-slate-700 mb-4 sticky top-0 bg-white pb-2 border-b">直近のログ</h3>
            <div className="space-y-3">
               {history.slice().reverse().map(log => (
                 <div key={log.id} className="text-xs p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                       <span>{log.gameState.inning}回{log.gameState.topBottom} {log.gameState.outs}アウト {log.gameState.scoreDiff}</span>
                       <span className={log.pev >= 0 ? 'text-blue-600' : 'text-red-500'}>PEV: {log.pev.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{log.action}</span>
                       <span className="text-slate-500">→ {log.resultType} ({log.runsScored}点)</span>
                    </div>
                 </div>
               ))}
               {history.length === 0 && <div className="text-slate-400 text-center mt-10">記録なし</div>}
            </div>
         </div>
      </div>
    </div>
  );
};

export default GameInput;
