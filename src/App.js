import React, { useState, useEffect, useRef } from 'react';
import { Realtime } from 'ably';

// --- 配置區 ---
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;
const ably = new Realtime(ABLY_KEY);
const channel = ably.channels.get('matrix-sync');
const ZOOM_STEPS = [1, 1.5, 2, 3];
const SCREEN_WIDTH_PX = 160; 

const App = () => {
  // 取得螢幕 ID
  const params = new URLSearchParams(window.location.search);
  const screenId = parseInt(params.get('id')) || 0;

  // --- 狀態管理 ---
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [zoomIndex, setZoomIndex] = useState(0);
  const [offsets, setOffsets] = useState([0, -15, 8, -5, 12]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showTestPattern, setShowTestPattern] = useState(false);
  
  // --- 雲端同步監聽 ---
  useEffect(() => {
    channel.subscribe('update', (msg) => {
      setView(msg.data.view);
      setZoomIndex(msg.data.zoomIndex);
    });
    return () => channel.unsubscribe();
  }, []);

  // --- 互動邏輯 ---
  // 雙擊循環縮放並廣播
  const handleDoubleClick = () => {
    if (isCalibrating) return;
    const nextIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
    const newState = { 
        view: { ...view, scale: ZOOM_STEPS[nextIndex], x: 0, y: 0 },
        zoomIndex: nextIndex 
    };
    
    setView(newState.view);
    setZoomIndex(newState.zoomIndex);
    channel.publish('update', newState); // 廣播給其他螢幕
  };

  // 校準單元 Y 軸
  const adjustOffset = (index, delta) => {
    const newOffsets = [...offsets];
    newOffsets[index] += delta;
    setOffsets(newOffsets);
  };

  return (
    <div className="min-h-screen bg-black text-slate-300 p-8 select-none overflow-hidden">
      {/* 這裡保留您精美的 Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-black text-white uppercase">Matrix-X5 Sync System</h1>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Unit ID: {screenId} | Online Sync Active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTestPattern(!showTestPattern)} className="px-4 py-2 text-xs font-bold rounded bg-zinc-900 border border-zinc-700">
            {showTestPattern ? 'CONTENT' : 'TEST PATTERN'}
          </button>
          <button onClick={() => setIsCalibrating(!isCalibrating)} className={`px-4 py-2 text-xs font-bold rounded ${isCalibrating ? 'bg-red-600' : 'bg-white text-black'}`}>
            {isCalibrating ? 'SAVE' : 'CALIBRATE'}
          </button>
        </div>
      </header>

      {/* 核心顯示區：根據 ID 顯示對應區塊 */}
      <main className="flex justify-center gap-2" onDoubleClick={handleDoubleClick}>
        {/* 在實際部署時，每台廣告機只會看到這 5 個 div 中的其中一個 (根據 ID) */}
        {/* 這裡為了讓您在電腦預覽，保留了 5 個單元的顯示邏輯 */}
        {offsets.map((yOffset, i) => {
            // 如果是線上版，每台機器只顯示自己 ID 的那個單元
            if (i !== screenId) return null; 

            return (
                <div key={i} className="relative bg-zinc-950 border border-zinc-800 overflow-hidden"
                     style={{ width: '320px', height: '568px', marginTop: `${yOffset}px` }}>
                    <div className="absolute w-[1600px] h-[900px]" 
                         style={{ 
                            transformOrigin: '0 0',
                            transform: `translate3d(${view.x - (i * SCREEN_WIDTH_PX * (320/160))}px, ${view.y}px, 0) scale(${view.scale})`,
                            transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
                         }}>
                        {showTestPattern ? <TestGrid /> : <img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=2000" className="w-full h-full object-cover" />}
                    </div>
                    {isCalibrating && <div className="absolute inset-0 border-4 border-cyan-500 flex items-center justify-center text-cyan-500">CALIBRATING UNIT {i}</div>}
                </div>
            );
        })}
      </main>
      
      {/* 校準控制按鈕 (僅在校準模式顯示) */}
      {isCalibrating && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
              <button onClick={() => adjustOffset(screenId, -2)} className="bg-zinc-800 p-4 rounded-full">▲</button>
              <button onClick={() => adjustOffset(screenId, 2)} className="bg-zinc-800 p-4 rounded-full">▼</button>
          </div>
      )}
    </div>
  );
};

const TestGrid = () => (
    <div className="w-full h-full absolute inset-0" style={{ 
        backgroundImage: `linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
    }} />
);

export default App;
