import React from 'react';
import { RunnerState } from '../types';

interface FieldVisualProps {
  runnerState: RunnerState;
  onChange: (newState: RunnerState) => void;
  readOnly?: boolean;
}

const FieldVisual: React.FC<FieldVisualProps> = ({ runnerState, onChange, readOnly = false }) => {
  // Parse current state string "000" -> [1st, 2nd, 3rd]
  const bases = [
    runnerState[0] === '1', // 1st
    runnerState[1] === '2', // 2nd
    runnerState[2] === '3', // 3rd
  ];

  const toggleBase = (baseIndex: number) => {
    if (readOnly) return;
    const newBases = [...bases];
    newBases[baseIndex] = !newBases[baseIndex];
    
    // Reconstruct string
    const first = newBases[0] ? '1' : '0';
    const second = newBases[1] ? '2' : '0';
    const third = newBases[2] ? '3' : '0';
    
    // We map this back to the closest enum match. 
    // Ideally we just construct the string, but let's be type safe with the Enum if possible, 
    // or just cast since the Enum values match the structural pattern "123".
    const stateString = `${first}${second}${third}`;
    onChange(stateString as RunnerState);
  };

  return (
    <div className="relative w-48 h-48 mx-auto bg-green-700 rounded-lg border-2 border-green-800 shadow-inner flex items-center justify-center">
      {/* Diamond Lines */}
      <div className="absolute w-28 h-28 border-2 border-white/50 transform rotate-45"></div>
      
      {/* 2nd Base */}
      <button 
        onClick={() => toggleBase(1)}
        className={`absolute top-6 left-1/2 transform -translate-x-1/2 w-8 h-8 rotate-45 border-2 border-white shadow-md transition-colors ${bases[1] ? 'bg-yellow-400' : 'bg-white/20 hover:bg-white/40'}`}
        disabled={readOnly}
      />
      
      {/* 3rd Base */}
      <button 
        onClick={() => toggleBase(2)}
        className={`absolute top-1/2 left-6 transform -translate-y-1/2 w-8 h-8 rotate-45 border-2 border-white shadow-md transition-colors ${bases[2] ? 'bg-yellow-400' : 'bg-white/20 hover:bg-white/40'}`}
        disabled={readOnly}
      />

      {/* 1st Base */}
      <button 
        onClick={() => toggleBase(0)}
        className={`absolute top-1/2 right-6 transform -translate-y-1/2 w-8 h-8 rotate-45 border-2 border-white shadow-md transition-colors ${bases[0] ? 'bg-yellow-400' : 'bg-white/20 hover:bg-white/40'}`}
        disabled={readOnly}
      />

      {/* Home Plate */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-8 h-8">
        <div className="w-full h-full bg-white clip-home-plate"></div>
      </div>
    </div>
  );
};

export default FieldVisual;