import React, { useState, useEffect } from 'react';
import { Realtime } from 'ably';
import { motion } from 'framer-motion';

// 從環境變數讀取 Key
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;
const ably = new Realtime(ABLY_KEY);
const channel = ably.channels.get('matrix-sync');
const ZOOM_STEPS = [1, 1.5, 2, 3]; // 循環縮放倍率

function App() {
  // 從網址抓 ID (例如 ?id=0)
  const params = new URLSearchParams(window.location.search);
  const screenId = parseInt(params.get('id')) || 0;

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [zoomIndex, setZoomIndex] = useState(0);

  useEffect(() => {
    // 監聽雲端訊號
    const subscriber = (msg) => {
      setView(msg.data.view);
      setZoomIndex(msg.data.zoomIndex);
    };
    channel.subscribe('update', subscriber);
    return () => channel.unsubscribe('update', subscriber);
  }, []);

  const handleDoubleClick = () => {
    const nextIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
    const newState = { 
      view: { ...view, scale: ZOOM_STEPS[nextIndex], x: 0, y: 0 },
      zoomIndex: nextIndex 
    };
    // 本地更新並廣播
    setView(newState.view);
    setZoomIndex(newState.zoomIndex);
    channel.publish('update', newState);
  };

  return (
    <div 
      className="w-screen h-screen bg-black overflow-hidden relative cursor-pointer" 
      onDoubleClick={handleDoubleClick}
    >
      {/* 這裡是內容主體 */}
      <motion.div
        animate={{ 
          // 核心公式：根據 ID 位移 100% 的寬度
          x: view.x - (screenId * window.innerWidth), 
          y: view.y,
          scale: view.scale 
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute top-0 left-0 w-full h-full origin-top-left"
        style={{
          // 這裡放測試圖，確保畫面不再是黑色的
          backgroundImage: 'url("https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2560&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* 狀態標籤 (方便調試) */}
      <div className="absolute top-4 left-4 z-50 bg-black/60 p-2 rounded border border-cyan-500/50">
        <div className="text-cyan-400 font-mono text-xs uppercase tracking-tighter">
          Unit: {screenId} | Zoom: {Math.round(view.scale * 100)}%
        </div>
      </div>

      {/* 雙擊提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.2em]">
        Double Tap to Sync Zoom
      </div>
    </div>
  );
}

export default App;