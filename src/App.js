import React, { useState, useEffect } from 'react';
import { Realtime } from 'ably';
import { motion } from 'framer-motion';

// --- 系統配置 ---
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;
const ZOOM_STEPS = [1, 1.5, 2, 3]; 

// 初始化 Ably (增加錯誤防護)
let ably, channel;
try {
  if (ABLY_KEY) {
    ably = new Realtime(ABLY_KEY);
    channel = ably.channels.get('matrix-sync-channel');
  }
} catch (e) {
  console.error("Ably Init Error:", e);
}

const App = () => {
  const params = new URLSearchParams(window.location.search);
  const screenId = parseInt(params.get('id')) || 0;

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [offsets, setOffsets] = useState([0, -15, 8, -5, 12]);

  // 雲端同步監聽
  useEffect(() => {
    if (!channel) return;
    const subscribe = (msg) => {
      setView(msg.data.view);
      setZoomIndex(msg.data.zoomIndex);
    };
    channel.subscribe('update_view', subscribe);
    return () => channel.unsubscribe('update_view', subscribe);
  }, []);

  // 雙擊循環縮放邏輯
  const handleDoubleClick = () => {
    if (isCalibrating) return;
    const nextIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
    const newState = { 
      view: { x: 0, y: 0, scale: ZOOM_STEPS[nextIndex] },
      zoomIndex: nextIndex 
    };
    setView(newState.view);
    setZoomIndex(newState.zoomIndex);
    if (channel) channel.publish('update_view', newState);
  };

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100vw', height: '100vh',
        backgroundColor: '#0f172a', // 深藍色底色，保證不全黑
        color: 'white', overflow: 'hidden',
        position: 'relative', cursor: 'pointer',
        margin: 0, padding: 0
      }}
    >
      {/* 1. 頂部狀態標籤 (使用內聯樣式避開 Tailwind) */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px', zIndex: 100,
        padding: '12px 16px', background: 'rgba(0,0,0,0.7)', 
        borderRadius: '8px', border: '1px solid #22d3ee',
        fontFamily: 'monospace', fontSize: '14px', pointerEvents: 'none'
      }}>
        <div style={{ color: '#22d3ee', fontWeight: 'bold' }}>MATRIX-X5 SYSTEM</div>
        <div>UNIT_ID: {screenId}</div>
        <div>ZOOM: {Math.round(view.scale * 100)}%</div>
      </div>

      {/* 2. 核心內容畫布 (加上位移補償) */}
      <motion.div
        animate={{ 
          x: view.x - (screenId * window.innerWidth), 
          y: view.y + offsets[screenId],
          scale: view.scale 
        }}
        transition={{ type: "spring", stiffness: 100, damping: 25 }}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          originX: 0, originY: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2560')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1e293b' // 圖片未載入前的備用色
        }}
      />

      {/* 3. 校準控制按鈕 */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsCalibrating(!isCalibrating); }}
          style={{
            padding: '10px 20px', borderRadius: '6px', border: 'none',
            backgroundColor: isCalibrating ? '#ef4444' : '#22d3ee',
            color: 'black', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}
        >
          {isCalibrating ? 'SAVE CONFIG' : 'CALIBRATE'}
        </button>
      </div>

      {isCalibrating && (
        <div style={{
          position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '30px', zIndex: 110, 
          background: 'rgba(15, 23, 42, 0.9)', padding: '25px', 
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setOffsets(prev => { const n = [...prev]; n[screenId] -= 2; return n; }); }} 
            style={{ width: '60px', height: '60px', borderRadius: '30px', border: 'none', background: '#334155', color: 'white', fontSize: '24px', cursor: 'pointer' }}
          >▲</button>
          <button 
            onClick={(e) => { e.stopPropagation(); setOffsets(prev => { const n = [...prev]; n[screenId] += 2; return n; }); }} 
            style={{ width: '60px', height: '60px', borderRadius: '30px', border: 'none', background: '#334155', color: 'white', fontSize: '24px', cursor: 'pointer' }}
          >▼</button>
        </div>
      )}

      {/* 4. 操作提示 */}
      {!isCalibrating && (
        <div style={{
          position: 'absolute', bottom: '30px', width: '100%', textAlign: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '4px',
          textTransform: 'uppercase', pointerEvents: 'none'
        }}>
          Double Tap to Sync Zoom
        </div>
      )}
    </div>
  );
};

export default App;