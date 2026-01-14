
import React, { useState, useEffect, useMemo } from 'react';
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
import { Plus, X, RotateCcw, TrendingUp, Edit2, Hash, Activity, Trash2 } from 'lucide-react';

interface Props {
  onLogSave: (log: PlayLog) => void;
  onLogDelete: (id: string) => void;
  history: PlayLog[];
}

const GameInput: React.FC<Props> = ({ onLogSave, onLogDelete, history }) => {
  // --- UI State ---
  // 0: Situation Input (Strategy View), 1: Action/Result Input (Logging)
  const [step, setStep] = useState<0 | 1>(0);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teams, setTeams] = useState<string[]>([]);

  // --- Game Data State ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Teams
  const [visitorTeam, setVisitorTeam] = useState('堺シュライクス');
  const [homeTeam, setHomeTeam] = useState('和歌山ウェイブス');

  const [inning, setInning] = useState(1);
  const [topBottom, setTopBottom] = useState<'表' | '裏'>('表');
  
  // Derived Offense/Defense
  const offenseTeam = topBottom === '表' ? visitorTeam : homeTeam;
  const defenseTeam = topBottom === '表' ? homeTeam : visitorTeam;
  
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
  const [pitchCount, setPitchCount] = useState<number>(1);
  
  // New: Next Count State (for logging pitch results)
  const [nextBalls, setNextBalls] = useState<0 | 1 | 2 | 3>(0);
  const [nextStrikes, setNextStrikes] = useState<0 | 1 | 2>(0);

  const currentState: GameState = { 
    inning, 
    topBottom, 
    outs, 
    runners, 
    scoreDiff, 
    opponent: defenseTeam,
    offenseTeam,
    defenseTeam,
    balls,
    strikes
  };

  // Live RE Calculation
  const currentRE = getRunExpectancy(outs, runners, balls, strikes);

  // --- Calculations ---

  // Calculate cumulative pitches for the current inning from history
  const historyInningPitches = useMemo(() => {
      return history
        .filter(l => 
            l.date === date && 
            l.gameState.inning === inning && 
            l.gameState.topBottom === topBottom &&
            // Filter by defense team to be safe, though inning/topBottom should suffice
            l.defenseTeam === defenseTeam
        )
        .reduce((sum, l) => sum + (l.pitchCount || 0), 0);
  }, [history, date, inning, topBottom, defenseTeam]);

  // Total Inning Pitches (History + Current Editing)
  const currentInningTotalPitches = historyInningPitches + (step === 1 ? pitchCount : 0);

  // Load Teams
  useEffect(() => {
    const savedTeams = localStorage.getItem('waves_teams');
    const defaults = ['和歌山ウェイブス', '堺シュライクス', '淡路島ウォリアーズ', '姫路イーグレッターズ', '兵庫ブレイバーズ', '大阪ゼロロクブルズ'];

    if (savedTeams) {
      try {
        let parsed = JSON.parse(savedTeams);
        // Ensure Wakayama Waves exists
        if (!parsed.includes('和歌山ウェイブス')) {
            parsed = ['和歌山ウェイブス', ...parsed];
            localStorage.setItem('waves_teams', JSON.stringify(parsed));
        }
        setTeams(parsed);
      } catch (e) {
        setTeams(defaults);
        localStorage.setItem('waves_teams', JSON.stringify(defaults));
      }
    } else {
      setTeams(defaults);
      localStorage.setItem('waves_teams', JSON.stringify(defaults));
    }
  }, []);

  const isPitchEvent = [ResultType.TAKE_BALL, ResultType.TAKE_STRIKE, ResultType.SWING_STRIKE, ResultType.FOUL].includes(resultType);

  // Auto-calculate pitch count based on count + 1
  useEffect(() => {
    if (step === 1) {
       if (isPitchEvent) {
         setPitchCount(1);
       } else {
         // Auto-calc: Balls + Strikes + 1 (The final pitch)
         setPitchCount(balls + strikes + 1);
       }
    }
  }, [balls, strikes, isPitchEvent, step]);

  // Update Next Count automatically when ResultType changes OR when Current Count changes
  useEffect(() => {
    if (step === 1) {
        if (resultType === ResultType.TAKE_BALL) {
            setNextBalls(Math.min(3, balls + 1) as 0|1|2|3);
            setNextStrikes(strikes);
        } else if (resultType === ResultType.TAKE_STRIKE || resultType === ResultType.SWING_STRIKE || resultType === ResultType.FOUL) {
            setNextBalls(balls);
            setNextStrikes(Math.min(2, strikes + 1) as 0|1|2);
            // Special case: Foul with 2 strikes stays 2 strikes
            if (resultType === ResultType.FOUL && strikes === 2) {
                setNextStrikes(2);
            }
        } else {
            // Ball In Play / End of AB -> Reset for next batter
            setNextBalls(0);
            setNextStrikes(0);
        }
    }
  }, [resultType, balls, strikes, step]);

  // --- Handlers ---

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    if (teams.includes(newTeamName)) {
      alert('既に存在するチーム名です');
      return;
    }
    const updated = [...teams, newTeamName];
    setTeams(updated);
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
    setNextOuts(outs); 
    setNextRunners(runners);
    // Initialize next count based on current
    setNextBalls(balls);
    setNextStrikes(strikes);
    // Reset pitch count for new entry
    setPitchCount(1);
    setStep(1);
  };

  const handleLogSubmit = () => {
    if (!selectedAction) return;

    const currentREVal = getRunExpectancy(outs, runners, balls, strikes);
    const nextREVal = nextOuts === 3 ? 0 : getRunExpectancy(nextOuts, nextRunners, nextBalls, nextStrikes);
    
    // Pass counts to PEV calculation
    const pev = calculatePEV(
        runsScored, 
        currentREVal, 
        nextOuts, 
        nextRunners, 
        resultType, 
        nextBalls, 
        nextStrikes
    );

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
      nextBalls, // Log the count state
      nextStrikes,
      pitchCount: pitchCount, // Log pitch count
      currentRE: currentREVal,
      nextRE: nextREVal,
      pev,
      offenseTeam,
      defenseTeam
    };

    onLogSave(log);
    
    // State Transition Logic
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
        
        // Critical: Update the main count state to the "Next Count" 
        // This allows continuous pitch-by-pitch logging
        setBalls(nextBalls);
        setStrikes(nextStrikes);
    }

    setRunsScored(0);
    setSelectedAction(null);
    setStep(0); // Go back to strategy view
  };

  const handleUndo = (log: PlayLog) => {
    if (window.confirm('直近の記録を取り消して、状況を元に戻しますか？')) {
        // Restore state from the log's BEFORE state
        setInning(log.gameState.inning);
        setTopBottom(log.gameState.topBottom);
        setOuts(log.gameState.outs);
        setRunners(log.gameState.runners);
        setScoreDiff(log.gameState.scoreDiff);
        setBalls(log.gameState.balls);
        setStrikes(log.gameState.strikes);
        
        // Restore Teams (infer from top/bottom)
        if (log.gameState.topBottom === '表') {
            if (log.gameState.offenseTeam) setVisitorTeam(log.gameState.offenseTeam);
            if (log.gameState.defenseTeam) setHomeTeam(log.gameState.defenseTeam);
        } else {
            if (log.gameState.offenseTeam) setHomeTeam(log.gameState.offenseTeam);
            if (log.gameState.defenseTeam) setVisitorTeam(log.gameState.defenseTeam);
        }
        
        // Reset Inputs
        setPitchCount(1);
        setStep(0); // Ensure we are on the input screen

        onLogDelete(log.id);
    }
  };

  // Helper to determine color for pitch count
  const getPitchCountColor = (count: number) => {
      if (count < 15) return 'text-slate-600 bg-slate-100';
      if (count < 25) return 'text-blue-700 bg-blue-100';
      if (count < 35) return 'text-amber-700 bg-amber-100';
      return 'text-red-700 bg-red-100 animate-pulse'; // High fatigue/Pressure
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
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
           <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-3">
               {/* Date & Matchup */}
               <div className="flex flex-col gap-1 w-full sm:w-auto">
                 <input 
                   type="date" 
                   value={date} 
                   onChange={(e) => setDate(e.target.value)}
                   className="text-[10px] font-bold text-slate-400 bg-transparent outline-none w-fit" 
                 />
                 <div className="flex items-center gap-2 text-sm sm:text-base">
                   {/* Visitor */}
                   <div className={`flex items-center gap-1 ${topBottom === '表' ? 'opacity-100 font-bold' : 'opacity-60 grayscale'}`}>
                     <span className={`w-2 h-2 rounded-full ${topBottom === '表' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                     <select 
                       value={visitorTeam} 
                       onChange={e => setVisitorTeam(e.target.value)}
                       className="border-none bg-transparent outline-none cursor-pointer max-w-[100px] sm:max-w-[140px] truncate" 
                     >
                       {teams.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                   </div>
                   
                   <span className="text-slate-300 text-xs">vs</span>
                   
                   {/* Home */}
                   <div className={`flex items-center gap-1 ${topBottom === '裏' ? 'opacity-100 font-bold' : 'opacity-60 grayscale'}`}>
                     <span className={`w-2 h-2 rounded-full ${topBottom === '裏' ? 'bg-red-500' : 'bg-slate-300'}`}></span>
                     <select 
                       value={homeTeam} 
                       onChange={e => setHomeTeam(e.target.value)}
                       className="border-none bg-transparent outline-none cursor-pointer max-w-[100px] sm:max-w-[140px] truncate" 
                     >
                       {teams.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                   </div>
                   <button onClick={() => setShowTeamModal(true)} className="text-slate-300 hover:text-slate-500"><Plus size={14}/></button>
                 </div>
               </div>

               {/* Inning Control */}
               <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setInning(Math.max(1, inning-1))} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded font-bold">-</button>
                  <span className="font-mono font-bold w-10 text-center text-lg text-slate-800">{inning}</span>
                  <button onClick={() => setInning(inning+1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-white rounded font-bold">+</button>
                  <div className="w-px h-5 bg-slate-300 mx-2"></div>
                  <button onClick={() => setTopBottom('表')} className={`px-2 py-1 text-xs font-bold rounded ${topBottom === '表' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>表</button>
                  <button onClick={() => setTopBottom('裏')} className={`px-2 py-1 text-xs font-bold rounded ${topBottom === '裏' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>裏</button>
               </div>
           </div>

           {/* Pitch Counter Bar */}
           <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${getPitchCountColor(currentInningTotalPitches)} transition-colors`}>
               <div className="flex items-center gap-2">
                   <Activity size={16} />
                   <span className="text-xs font-bold uppercase tracking-wider">Inning Pitches</span>
               </div>
               <div className="flex items-baseline gap-1">
                   <span className="text-xl font-black font-mono tracking-tight">{currentInningTotalPitches}</span>
                   <span className="text-[10px] opacity-70">球</span>
               </div>
           </div>
        </div>

        {/* STEP 0: SITUATION INPUT */}
        {step === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-left-4 fade-in">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700">状況入力 (BEFORE)</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${topBottom === '表' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    攻撃: {offenseTeam}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                    <TrendingUp size={12} />
                    RE: {currentRE.toFixed(3)}
                </span>
              </div>
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
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Score Diff (Offense)</label>
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
               <div>
                  <h3 className="font-bold text-blue-900">結果入力 (AFTER)</h3>
                  <div className="text-[10px] text-blue-700 flex gap-2 font-mono mt-0.5">
                     <span>{inning}回{topBottom}</span>
                     <span>{outs}死 {runners !== '000' && '走者有'}</span>
                  </div>
               </div>
               <button onClick={() => setStep(0)} className="text-xs text-blue-600 hover:underline">← 状況に戻る</button>
             </div>

             <div className="p-6 space-y-6">
                
                {/* BULLETIN MODE: Count & Pitch Correction */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 bg-amber-200 text-[10px] font-bold text-amber-800 rounded-bl">速報モード対応</div>
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                        {/* Count Correction */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <Edit2 size={12} className="text-amber-600" />
                                    カウント修正 (打席結果時点)
                                </label>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-2 rounded border border-amber-100">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-green-600 w-3">B</span>
                                    <div className="flex gap-0.5">
                                        {[0,1,2,3].map(b => (
                                            <button 
                                                key={b} 
                                                onClick={() => setBalls(b as 0|1|2|3)}
                                                className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${balls === b ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >{b}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-px h-6 bg-slate-200"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-yellow-500 w-3">S</span>
                                    <div className="flex gap-0.5">
                                        {[0,1,2].map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => setStrikes(s as 0|1|2)}
                                                className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${strikes === s ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pitch Count Input with Accumulation Logic */}
                        <div className="flex-none w-full md:w-auto">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-2">
                                <Hash size={12} className="text-amber-600" />
                                今回の投球数
                            </label>
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => setPitchCount(Math.max(1, pitchCount - 1))} className="w-8 h-8 rounded bg-white border border-amber-200 text-amber-700 font-bold hover:bg-amber-100">-</button>
                                <div className="w-12 h-8 bg-white border border-amber-200 rounded flex items-center justify-center font-bold text-slate-700 text-lg">
                                    {pitchCount}
                                </div>
                                <button onClick={() => setPitchCount(pitchCount + 1)} className="w-8 h-8 rounded bg-white border border-amber-200 text-amber-700 font-bold hover:bg-amber-100">+</button>
                            </div>
                            
                            {/* Cumulative Display for Verification */}
                            <div className="text-[10px] bg-amber-100 text-amber-900 p-1.5 rounded font-mono border border-amber-200 whitespace-nowrap">
                                累積: <strong>{currentInningTotalPitches}</strong> <span className="opacity-70">(過去{historyInningPitches} + 今{pitchCount})</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-2 opacity-80">
                        ※カウントを入力すると最低投球数（ボール+ストライク+1）が自動入力されます。ファウルで粘った場合などは＋で調整し、一球速報の「この回の球数」と累積が合うようにしてください。
                    </p>
                </div>

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
                        <label className="block text-xs font-bold text-slate-400 mb-2">結果タイプ</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium"
                          value={resultType}
                          onChange={(e) => setResultType(e.target.value as ResultType)}
                        >
                          <optgroup label="安打（ヒット）">
                              <option value={ResultType.SINGLE}>{ResultType.SINGLE}</option>
                              <option value={ResultType.DOUBLE}>{ResultType.DOUBLE}</option>
                              <option value={ResultType.TRIPLE}>{ResultType.TRIPLE}</option>
                              <option value={ResultType.HOMERUN}>{ResultType.HOMERUN}</option>
                              <option value={ResultType.HIT}>{ResultType.HIT}</option>
                          </optgroup>
                          <optgroup label="凡打・アウト">
                              <option value={ResultType.GROUNDER}>{ResultType.GROUNDER}</option>
                              <option value={ResultType.FLY}>{ResultType.FLY}</option>
                              <option value={ResultType.LINER}>{ResultType.LINER}</option>
                              <option value={ResultType.POP_FLY}>{ResultType.POP_FLY}</option>
                          </optgroup>
                          <optgroup label="特殊なアウト">
                              <option value={ResultType.DOUBLE_PLAY}>{ResultType.DOUBLE_PLAY}</option>
                              <option value={ResultType.TRIPLE_PLAY}>{ResultType.TRIPLE_PLAY}</option>
                              <option value={ResultType.SAC_BUNT}>{ResultType.SAC_BUNT}</option>
                              <option value={ResultType.SAC_FLY}>{ResultType.SAC_FLY}</option>
                          </optgroup>
                          <optgroup label="四死球・出塁">
                              <option value={ResultType.WALK}>{ResultType.WALK}</option>
                              <option value={ResultType.HIT_BY_PITCH}>{ResultType.HIT_BY_PITCH}</option>
                              <option value={ResultType.INTENTIONAL_WALK}>{ResultType.INTENTIONAL_WALK}</option>
                              <option value={ResultType.FIELDERS_CHOICE}>{ResultType.FIELDERS_CHOICE}</option>
                              <option value={ResultType.ERROR}>{ResultType.ERROR}</option>
                          </optgroup>
                          <optgroup label="三振">
                              <option value={ResultType.STRIKEOUT_SWINGING}>{ResultType.STRIKEOUT_SWINGING}</option>
                              <option value={ResultType.STRIKEOUT_LOOKING}>{ResultType.STRIKEOUT_LOOKING}</option>
                              <option value={ResultType.STRIKEOUT_UNCATCH}>{ResultType.STRIKEOUT_UNCATCH}</option>
                              <option value={ResultType.STRIKEOUT}>{ResultType.STRIKEOUT}</option>
                          </optgroup>
                          <optgroup label="1球ごと(待球など)">
                             <option value={ResultType.TAKE_BALL}>{ResultType.TAKE_BALL}</option>
                             <option value={ResultType.TAKE_STRIKE}>{ResultType.TAKE_STRIKE}</option>
                             <option value={ResultType.SWING_STRIKE}>{ResultType.SWING_STRIKE}</option>
                             <option value={ResultType.FOUL}>{ResultType.FOUL}</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Next Count Display/Edit */}
                      {isPitchEvent && (
                        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                           <label className="block text-xs font-bold text-indigo-800 mb-2">次のカウント (結果/AFTER)</label>
                           <div className="flex gap-4">
                               <div className="flex items-center gap-2">
                                   <span className="text-sm font-bold text-green-600">B</span>
                                   <div className="flex gap-1">
                                       {[0,1,2,3].map(b => (
                                           <button 
                                              key={b} 
                                              onClick={() => setNextBalls(b as 0|1|2|3)}
                                              className={`w-6 h-6 rounded border text-xs font-bold ${nextBalls === b ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-400'}`}
                                           >{b}</button>
                                       ))}
                                   </div>
                               </div>
                               <div className="flex items-center gap-2">
                                   <span className="text-sm font-bold text-yellow-500">S</span>
                                   <div className="flex gap-1">
                                       {[0,1,2].map(s => (
                                           <button 
                                              key={s} 
                                              onClick={() => setNextStrikes(s as 0|1|2)}
                                              className={`w-6 h-6 rounded border text-xs font-bold ${nextStrikes === s ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white text-slate-400'}`}
                                           >{s}</button>
                                       ))}
                                   </div>
                               </div>
                           </div>
                        </div>
                      )}

                      {!isPitchEvent && (
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
                      )}
                   </div>

                   {/* Next State */}
                   <div className="space-y-4">
                      {/* Only show Next Outs/Runners if it's NOT a simple pitch event, OR allow editing if something weird happened */}
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
               {history.slice().reverse().map((log, index) => {
                 const deltaRE = log.nextRE - log.currentRE;
                 const risk = log.pev - log.runsScored - deltaRE;
                 return (
                 <div key={log.id} className="text-xs p-3 bg-slate-50 rounded border border-slate-100 relative group">
                    {/* Delete Button - Only for the most recent log (top of the list) */}
                    {index === 0 && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUndo(log);
                            }}
                            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors z-20 cursor-pointer"
                            title="このログを取り消し(Undo)"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}

                    <div className="flex justify-between font-bold text-slate-700 mb-1 pr-6 items-start">
                       <span className="mt-0.5">{log.gameState.inning}回{log.gameState.topBottom} {log.gameState.outs}アウト {log.gameState.scoreDiff}</span>
                       <div className="text-right">
                           <span className={`block text-sm ${log.pev >= 0 ? 'text-blue-600' : 'text-red-500'}`}>PEV: {log.pev.toFixed(2)}</span>
                           <div className="text-[10px] text-slate-400 font-mono tracking-tighter whitespace-nowrap" title="PEV = 得点 + (AfterRE - BeforeRE) + 戦略調整">
                              {log.runsScored} + ({log.nextRE.toFixed(2)} - {log.currentRE.toFixed(2)}) {risk >= 0 ? '+' : ''}{risk.toFixed(2)}
                           </div>
                       </div>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                       <span>{log.offenseTeam || 'Unknown'} 攻撃</span>
                       {/* Show Count Detail */}
                       <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">
                           {log.gameState.balls}-{log.gameState.strikes} → {log.nextBalls}-{log.nextStrikes}
                           {log.pitchCount && log.pitchCount > 1 && ` (${log.pitchCount}球)`}
                       </span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{log.action}</span>
                       <span className="text-slate-500">→ {log.resultType} ({log.runsScored}点)</span>
                    </div>
                 </div>
               )})}
               {history.length === 0 && <div className="text-slate-400 text-center mt-10">記録なし</div>}
            </div>
         </div>
      </div>
    </div>
  );
};

export default GameInput;
