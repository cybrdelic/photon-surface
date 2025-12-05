
import React, { useState } from 'react';
import WebGPUCanvas from './components/WebGPUCanvas';
import { SceneType, VisualizationMode, ManifoldParams } from './types';
import { Layers, Eye, Move, MousePointer2, ZoomIn, Sliders, ScanLine, Bug, Gem } from 'lucide-react';

const App: React.FC = () => {
  const [visMode, setVisMode] = useState<VisualizationMode>(VisualizationMode.RENDER);
  const [manifold, setManifold] = useState<ManifoldParams>({
    turbulenceStrength: 1.5,
    transitionOffset: 0.0,
    waxDensity: 1.2, // Lower default for deep translucency
    roughness: 0.1
  });

  const scene = SceneType.JADE;

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-white">
      <div className="absolute inset-0 z-0">
        <WebGPUCanvas sceneType={scene} visMode={visMode} manifold={manifold} />
      </div>

      {/* Main UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
        
        {/* Header */}
        <header className="pointer-events-auto">
          <h1 className="text-3xl font-light tracking-tight text-white/90">
            Photon<span className="font-bold">Surface</span> <span className="text-xs bg-white text-black px-1.5 py-0.5 rounded font-bold ml-2 align-middle">ART</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
               <Gem className="w-3 h-3 mr-1" />
               Fractional Geometry: Jade & Rock
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-3 max-w-md leading-relaxed">
             D determines Geometric Roughness (H=3-D).
             <br/>D=2.0 (Smooth/Wet Jade) vs D=2.8 (Rough/Dry Rock).
          </p>
        </header>

        {/* Legend */}
        {visMode === VisualizationMode.DIMENSION_FIELD && (
          <div className="absolute top-36 left-8 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl pointer-events-auto">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Dimension Field</div>
             <div className="space-y-3">
               <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded bg-[#00ffff] shadow-[0_0_10px_#00ffff]"></div>
                 <div>
                   <div className="text-xs font-bold text-cyan-200">D=2.0 (Jade)</div>
                   <div className="text-[9px] text-gray-400">Smooth (H=1.0)</div>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded bg-[#ff00ff] shadow-[0_0_10px_#ff00ff]"></div>
                 <div>
                   <div className="text-xs font-bold text-pink-200">D=2.5 (Mix)</div>
                   <div className="text-[9px] text-gray-400">Transition (H=0.5)</div>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-4 h-4 rounded bg-[#ffff00] shadow-[0_0_10px_#ffff00]"></div>
                 <div>
                   <div className="text-xs font-bold text-yellow-200">D=2.9 (Rock)</div>
                   <div className="text-[9px] text-gray-400">Rough (H=0.1)</div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* Manifold Control Panel */}
        <div className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-80 pointer-events-auto">
          <div className="flex items-center gap-2 mb-6 text-white border-b border-white/10 pb-4">
             <Sliders className="w-4 h-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Material Controls</span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300">Roughness Scale (Turbulence)</span>
                <span className="text-gray-500 font-mono">{manifold.turbulenceStrength.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="3.0" step="0.1"
                value={manifold.turbulenceStrength}
                onChange={(e) => setManifold({...manifold, turbulenceStrength: parseFloat(e.target.value)})}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300">Jade Density</span>
                <span className="text-gray-500 font-mono">{manifold.waxDensity.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.5" max="3.0" step="0.1"
                value={manifold.waxDensity}
                onChange={(e) => setManifold({...manifold, waxDensity: parseFloat(e.target.value)})}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="pointer-events-auto flex items-end justify-between">
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-2">Pass Visualization</div>
            
            <div className="flex flex-wrap gap-2 max-w-2xl">
                {/* Standard Modes */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-full p-1.5 flex gap-1 shadow-2xl">
                    <button onClick={() => setVisMode(VisualizationMode.RENDER)} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${visMode === VisualizationMode.RENDER ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10'}`}>
                        <Eye className="w-3 h-3" /> Render
                    </button>
                    <button onClick={() => setVisMode(VisualizationMode.SLICE)} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${visMode === VisualizationMode.SLICE ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                        <ScanLine className="w-3 h-3" /> Slice
                    </button>
                    <button onClick={() => setVisMode(VisualizationMode.DIMENSION_FIELD)} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${visMode === VisualizationMode.DIMENSION_FIELD ? 'bg-gradient-to-r from-cyan-500 to-yellow-500 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                        <Layers className="w-3 h-3" /> Structure
                    </button>
                </div>

                {/* Debug Modes */}
                <div className="bg-red-900/20 backdrop-blur-xl border border-red-500/20 rounded-full p-1.5 flex gap-1 shadow-2xl">
                    <button onClick={() => setVisMode(VisualizationMode.NORMAL)} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${visMode === VisualizationMode.NORMAL ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/20'}`}>
                        <Bug className="w-3 h-3" /> Nrm
                    </button>
                    <button onClick={() => setVisMode(VisualizationMode.STEPS)} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${visMode === VisualizationMode.STEPS ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/20'}`}>
                        Stp
                    </button>
                </div>
            </div>
          </div>

          <div className="text-right pointer-events-none opacity-60">
             <div className="flex gap-4 text-xs text-gray-400 bg-black/50 p-3 rounded-lg backdrop-blur-md border border-white/5">
                <div className="flex items-center gap-2"><MousePointer2 className="w-3 h-3"/> Orbit</div>
                <div className="flex items-center gap-2"><Move className="w-3 h-3"/> Pan</div>
                <div className="flex items-center gap-2"><ZoomIn className="w-3 h-3"/> Zoom</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
