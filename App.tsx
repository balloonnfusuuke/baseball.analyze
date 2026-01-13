import React, { useState, useEffect } from 'react';
import { PlayLog } from './types';
import GameInput from './components/GameInput';
import { Upload, Download, HelpCircle, X, MousePointerClick, ArrowRight, Save, Calculator } from 'lucide-react';

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
            // Confirm overwrite
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
    event.target.value = ''; // Reset input to allow selecting the same file again
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 relative">
      {/* Navigation / Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic font-serif">W</div>
             <h1 className="font-bold text-lg tracking-tight hidden sm:block">Wakayama Waves <span className="text-slate-400 font-normal">Strategy System</span></h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowHelp(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded border border-indigo-500 transition-colors flex items-center gap-2 font-bold shadow-sm"
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">使い方</span>
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
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
                <p className="font-bold mb-1">💡 このシステムは「戦略の評価」に特化しています</p>
                <p>スコアブックのように全ての球を記録する必要はありません。「ボールカウント」は画面上で随時更新し、<span className="font-bold underline">「プレー（打席完了、盗塁、エラーなど）」が完了した時だけ</span>ログを保存します。</p>
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
                    <h3 className="font-bold text-lg text-slate-800 mb-2">状況のセット・カウント更新</h3>
                    <p className="text-slate-600 mb-3 text-sm">
                      現在のアウト数、ランナー、ボールカウントを入力します。
                    </p>
                    <div className="bg-slate-100 p-3 rounded border border-slate-200 text-sm">
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        <li><strong>ボール・ストライク・ファウル:</strong> ランプをタップして更新するだけでOKです（記録ボタンを押す必要はありません）。</li>
                        <li><strong>AIコーチ:</strong> 迷った時は右側の「AI Coach」ボタンで作戦のヒントを得られます。</li>
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
                    <h3 className="font-bold text-lg text-slate-800 mb-2">結果入力へ進む (Commit)</h3>
                    <p className="text-slate-600 mb-3 text-sm">
                      以下のイベントが発生したら、画面下部の黒いボタン<strong>「結果入力へ進む」</strong>を押します。
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                      <span className="bg-white border px-2 py-1 rounded">打撃完了（ヒット/アウト）</span>
                      <span className="bg-white border px-2 py-1 rounded">盗塁</span>
                      <span className="bg-white border px-2 py-1 rounded">牽制死</span>
                      <span className="bg-white border px-2 py-1 rounded">パスボール進塁</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-none flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">3</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">詳細記録と保存</h3>
                    <p className="text-slate-600 mb-3 text-sm">
                      画面が切り替わります。実際に行った「作戦」と「結果」を入力してください。
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="block font-bold text-slate-700 mb-1">入力項目</span>
                        <ul className="list-disc list-inside text-slate-600">
                          <li>実行した作戦（強攻、バントなど）</li>
                          <li>打球結果（ゴロ、フライ、三振など）</li>
                          <li>入った点数</li>
                          <li>次（プレー後）のアウト・ランナー状況</li>
                        </ul>
                      </div>
                      <div className="flex items-center justify-center bg-green-50 rounded border border-green-100 p-3">
                         <div className="text-center">
                            <Save className="w-6 h-6 text-green-600 mx-auto mb-1" />
                            <span className="font-bold text-green-700 block">記録する (Save)</span>
                            <span className="text-xs text-green-600">PEV（貢献度）が自動計算されます</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* PEV Logic Section */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    PEV (貢献度) の計算ロジック
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-3">
                    <p className="font-mono bg-white p-3 border border-slate-300 rounded text-center font-bold text-slate-700 overflow-x-auto whitespace-nowrap">
                    PEV = 得点 + (プレー後の期待値 - プレー前の期待値) - リスク補正
                    </p>
                    <div className="text-slate-600 space-y-2">
                    <p><span className="font-bold text-slate-700">期待値 (RE24):</span> その状況（アウト・走者）からイニング終了までに平均何点入るかという統計的数値です。</p>
                    <p><span className="font-bold text-slate-700">仕組み:</span> 状況を「良くした（ヒット、進塁、得点）」ならプラス、「悪くした（アウト）」ならマイナスになります。</p>
                    <div className="bg-white p-3 rounded border border-slate-100">
                        <span className="block text-xs font-bold text-slate-500 mb-1">リスク補正パラメータ:</span>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                            <li><span className="font-bold text-red-500">三振: -0.2 pt</span> (進塁打の可能性がないためペナルティ)</li>
                            <li><span className="font-bold text-red-500">併殺: -0.5 pt</span> (チャンスを大きく潰すため重いペナルティ)</li>
                            <li><span className="font-bold text-blue-500">失策誘発: +0.3 pt</span> (強い打球等へのボーナス)</li>
                        </ul>
                    </div>
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