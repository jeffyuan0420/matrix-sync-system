import React, { useState, useEffect, useRef } from 'react';
import { Realtime } from 'ably';
import { motion } from 'framer-motion';

// --- 系統配置 ---
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;
const ZOOM_STEPS = [1, 1.5, 2, 3]; // 0%, 50%, 100%, 200% 縮放循環
const SCREEN_WIDTH = 1080; // 標準廣告機寬度像素

// 初始化 Ably (加上錯誤處理)
let ably, channel;
if (ABLY_KEY) {
  ably = new Realtime(ABLY_KEY);
  channel = ably.channels.get('matrix-sync-channel');
}

const App = () => {
  // 取得當前螢幕 ID (?id=0 ~ 4)
  const params = new URLSearchParams(window.location.search);
  const screenId = parseInt(params.get('id')) || 0;

  // --- 狀態管理 ---
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [zoomIndex, setZoomIndex] = useState(0);
  const [offsets, setOffsets] = useState([0, -15, 8, -5, 12]); // 您預設的物理偏移
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showTestPattern, setShowTestPattern] = useState(false);

  // --- 雲端同步監聽 ---
  useEffect(() => {
    if (!channel) return;

    const subscribe = (msg) => {
      // 接收來自其他螢幕的同步指令
      setView(msg.data.view);
      setZoomIndex(msg.data.zoomIndex);
    };

    channel.subscribe('update_view', subscribe);
    return () => channel.unsubscribe('update_view', subscribe);
  }, []);

  // --- 核心互動：雙擊循環縮放 ---
  const handleDoubleClick = () => {
    if (isCalibrating) return;
    
    const nextIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
    const nextScale = ZOOM_STEPS[nextIndex];
    
    // 計算新狀態：縮放時回歸中心 (x:0, y:0)
    const newState = { 
      view: { x: 0, y: 0, scale: nextScale },
      zoomIndex: nextIndex 
    };

    // 1. 更新本地畫面
    setView(newState.view);
    setZoomIndex(newState.zoomIndex);

    // 2. 廣播給所有連線中的螢幕
    if (channel) {
      channel.publish('update_view', newState);
    }
  };

  // --- 校準邏輯 ---
  const adjustOffset = (index, delta) => {
    const newOffsets = [...offsets];
    newOffsets[index] += delta;
    setOffsets(newOffsets);
  };

  // --- 渲染內容 ---
  return (
    <div 
      className="w-screen h-screen bg-black text-white overflow-hidden relative select-none"
      onDoubleClick={handleDoubleClick}
    >
      {/* 頂部狀態列 */}
      <header className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-cyan-400">MATRIX-X5 SYNC</h1>
          <p className="text-[10px] font-mono text-zinc-500">UNIT_ID: {screenId} | STATUS: <span className="text-green-500">ONLINE</span></p>
        </div>
        
        <div className="flex gap-3 pointer-events-auto">
          <button 
            onClick={() => setShowTestPattern(!showTestPattern)}
            className={`px-3 py-1 text-[10px] font-bold rounded border transition ${showTestPattern ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-zinc-900 border-zinc-700'}`}
          >
            {showTestPattern ? 'CONTENT' : 'TEST GRID'}
          </button>
          <button 
            onClick={() => setIsCalibrating(!isCalibrating)}
            className={`px-3 py-1 text-[10px] font-bold rounded transition ${isCalibrating ? 'bg-red-600 text-white' : 'bg-white text-black'}`}
          >
            {isCalibrating ? 'DONE' : 'CALIBRATE'}
          </button>
        </div>
      </header>

      {/* 核心顯示畫布 */}
      <motion.div
        className="absolute top-0 left-0 w-[5400px] h-full origin-top-left"
        animate={{ 
          // 根據螢幕 ID 位移，並加上手動校準的 Y 軸偏移
          x: view.x - (screenId * window.innerWidth), 
          y: view.y + (isCalibrating ? 0 : offsets[screenId]),
          scale: view.scale 
        }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{
          // 背景圖片：使用 Unsplash 確定有效的 2K 圖片
          backgroundImage: showTestPattern 
            ? 'radial-gradient(circle, #22d3ee 1px, transparent 1px)' 
            : 'url("https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2560&q=80")',
          backgroundSize: showTestPattern ? '40px 40px' : 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#111' // 圖片載入前的底色
        }}
      />

      {/* 校準模式按鈕組 */}
      {isCalibrating && (
        <div className="absolute inset-0 z-40 bg-cyan-500/10 border-4 border-dashed border-cyan-500/30 flex items-center justify-center">
          <div className="flex flex-col gap-4 bg-black/80 p-6 rounded-2xl border border-white/10">
            <p className="text-center text-xs font-mono mb-2 text-cyan-400 underline">UNIT {screenId} Y-OFFSET: {offsets[screenId]}px</p>
            <div className="flex gap-4">
              <button onClick={() => adjustOffset(screenId, -2)} className="w-12 h-12 bg-zinc-800 rounded-full text-xl hover:bg-zinc-700">▲</button>
              <button onClick={() => adjustOffset(screenId, 2)} className="w-12 h-12 bg-zinc-800 rounded-full text-xl hover:bg-zinc-700">▼</button>
            </div>
          </div>
        </div>
      )}

      {/* 底部導航狀態 */}
      <footer className="absolute bottom-6 left-6 z-50">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/5">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Zoom Level</div>
          <div className="text-2xl font-light text-white">{Math.round(view.scale * 100)}%</div>
        </div>
      </footer>
    </div>
  );
};

export default App;