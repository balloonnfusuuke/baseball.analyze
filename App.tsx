
import React, { useState, useEffect } from 'react';
import { PlayLog } from './types';
import GameInput from './components/GameInput';
import { Upload, Download, HelpCircle, X, Calculator, Database } from 'lucide-react';
import { calculatePEV } from './services/strategyService';

const App: React.FC = () => {
  const [history, setHistory] = useState<PlayLog[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Load from local storage for persistence
  useEffect(() => {
    const saved = localStorage.getItem('waves_logs');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load logs", e);
      }
    }
  }, []);

  const handleSaveLog = (log: PlayLog) => {
    const newHistory = [...history, log];
    setHistory(newHistory);
    localStorage.setItem('waves_logs', JSON.stringify(newHistory));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `waves_strategy_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          const importedLogs = JSON.parse(content);
          if (Array.isArray(importedLogs)) {
            if (window.confirm(`現在のデータ（${history.length}件）を上書きして、ファイルから${importedLogs.length}件のデータを読み込みますか？`)) {
                setHistory(importedLogs);
                localStorage.setItem('waves_logs', JSON.stringify(importedLogs));
            }
          } else {
            alert('ファイル形式が正しくありません。');
          }
        }
      } catch (err) {
        console.error("Import failed", err);
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 relative">
      {/* Navigation / Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic font-serif">W</div>
             <div className="hidden sm:block">
                <h1 className="font-bold text-lg tracking-tight leading-none">Wakayama Waves</h1>
                <p className="text-[10px] text-slate-400 font-normal tracking-wider">STRATEGY OPTIMIZATION SYSTEM</p>
             </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             {/* Total Logs Counter */}
             <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                <Database size={12} className="text-blue-400" />
                <span className="text-xs text-slate-300">蓄積データ:</span>
                <span className="text-sm font-bold text-white font-mono">{history.length}</span>
                <span className="text-[10px] text-slate-500">件</span>
             </div>

             <div className="h-6 w-px bg-slate-700 hidden md:block"></div>

             <div className="flex gap-2">
                <button 
                onClick={() => setShowHelp(true)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded border border-indigo-500 transition-colors flex items-center gap-2 font-bold shadow-sm"
                >
                <HelpCircle size={14} />
                <span className="hidden sm:inline">使い方</span>
                </button>
                <label className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors cursor-pointer flex items-center gap-2">
                <Upload size={14} />
                <span className="hidden sm:inline">Import</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                <button 
                onClick={handleExport}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-2"
                >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="text-blue-600" />
                システムの使い方・入力手順
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              
              {/* Concept */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-bold mb-1">💡 このシステムは「戦略の正当性」を評価します</p>
                <p>
                  結果（ヒットやアウト）だけでなく、<span className="font-bold">「その作戦によって状況がどう良くなったか（PEV）」</span>を数値化します。<br/>
                  今回のアップデートで、<span className="font-bold underline">1球ごとのカウント変化（ボール・ストライク）</span>も評価対象になりました。「待球」作戦の価値も正確に算出できます。
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-6">
                
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-none flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg">1</div>
                    <div className="w-px h-full bg-slate-200"></div>
                  </div>
                  <div className="pb-4">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">状況入力 (Before)</h3>
                    <p className="text-slate-600 mb-2 text-sm">
                      現在のアウト・ランナー・カウント・対戦チームを入力します。
                    </p>
                    <div className="bg-slate-100 p-3 rounded border border-slate-200 text-sm">
                       <p className="font-bold text-slate-700 mb-1">ポイント:</p>
                       <ul className="list-disc list-inside space-y-1 text-slate-600">
                         <li>画面左上のRE数値は「その状況での平均期待得点」です。</li>
                         <li>ビジター/ホームを切り替えると、攻撃チームが自動判定されます。</li>
                       </ul>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-none flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">2</div>
                    <div className="w-px h-full bg-slate-200"></div>
                  </div>
                  <div className="pb-4">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">結果入力 (After)</h3>
                    <p className="text-slate-600 mb-2 text-sm">
                      「結果入力へ進む」を押し、作戦と結果を選びます。
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                       <div className="bg-white border p-2 rounded">
                          <span className="block font-bold text-blue-600 mb-1">打席完了ログ</span>
                          <p className="text-xs text-slate-500">
                              一球速報のカウント(2-2など)を入力すると、<span className="font-bold underline">自動で投球数(5球)が計算されます</span>。ファウル等でさらに粘った場合は手動で加算してください。
                          </p>
                       </div>
                       <div className="bg-white border p-2 rounded">
                          <span className="block font-bold text-green-600 mb-1">1球ごとログ（推奨）</span>
                          <p className="text-xs text-slate-500">「待球」→「ボール（見送）」など。1球ごとに記録することで、粘りの価値を評価できます。</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-none flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">3</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">保存・分析</h3>
                    <p className="text-slate-600 mb-2 text-sm">
                      記録するとPEV（貢献度）が計算され、次回の状況に自動で遷移します。
                    </p>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-sm text-yellow-800">
                       <span className="font-bold">分析ダッシュボード:</span>
                       <br/>
                       右側のパネルで「自チーム」と「全チーム平均」の傾向を切り替えて比較できます。
                    </div>
                  </div>
                </div>

              </div>

              {/* PEV Logic Section */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    PEV (貢献度) の計算ロジック (v2.0)
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-3">
                    <p className="font-mono bg-white p-3 border border-slate-300 rounded text-center font-bold text-slate-700 overflow-x-auto whitespace-nowrap">
                    PEV = 得点 + (After RE - Before RE) - リスク
                    </p>
                    <div className="text-slate-600 space-y-2">
                    <p><span className="font-bold text-slate-700">カウント別RE:</span> ボールが増えると期待値UP(+0.03〜)、ストライクが増えると期待値DOWN(-0.04〜)として計算します。</p>
                    <p>例：無死1塁(RE 0.85)からボールを見送って1-0(RE 0.88)になった場合、<span className="font-bold text-blue-600">+0.03の貢献</span>となります。</p>
                    </div>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowHelp(false)} 
                  className="px-8 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  理解しました
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <GameInput 
          onLogSave={handleSaveLog} 
          history={history}
        />
      </main>
      
      {/* Footer */}
      <footer className="text-center text-slate-400 text-xs py-6">
        © 2025 Wakayama Waves. System Design by Senior Strategy Engineer.
      </footer>
    </div>
  );
};

export default App;
