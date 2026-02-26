import React, { useState, useEffect } from 'react';
import { Realtime } from 'ably';
import { motion } from 'framer-motion';

// --- 系統配置 ---
const ABLY_KEY = process.env.REACT_APP_ABLY_KEY;
const ZOOM_STEPS = [1, 1.5, 2, 3]; 

// 初始化 Ably
let ably, channel;
if (ABLY_KEY) {
  ably = new Realtime(ABLY_KEY);
  channel = ably.channels.get('matrix-sync-channel');
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
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a', // 深藍色底色，確保不全黑
        color: 'white',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer'
      }}
    >
      {/* 狀態標籤 */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px', zIndex: 100,
        padding: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
        fontFamily: 'monospace', fontSize: '12px', border: '1px solid #22d3ee'
      }}>
        UNIT_ID: {screenId} | ZOOM: {Math.round(view.scale * 100)}%
      </div>

      {/* 核心內容畫布 */}
      <motion.div
        animate={{ 
          x: view.x - (screenId * window.innerWidth), 
          y: view.y + offsets[screenId],
          scale: view.scale 
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '500vw', // 撐開足夠寬度供 5 台螢幕切換
          height: '100vh',
          originX: 0,
          originY: 0,
          // 使用穩定圖片網址
          backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2560')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1e293b'
        }}
      />

      {/* 校準模式 UI */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <button 
          onClick={() => setIsCalibrating(!isCalibrating)}
          style={{
            padding: '8px 16px', borderRadius: '4px', border: 'none',
            backgroundColor: isCalibrating ? '#ef4444' : '#22d3ee',
            color: 'black', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          {isCalibrating ? 'SAVE' : 'CALIBRATE'}
        </button>
      </div>

      {isCalibrating && (
        <div style={{
          position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '20px', zIndex: 110, background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '15px'
        }}>
          <button onClick={() => setOffsets(prev => {
            const n = [...prev]; n[screenId] -= 2; return n;
          })} style={{ width: '50px', height: '50px', borderRadius: '25px', border: 'none', background: '#334155', color: 'white' }}>▲</button>
          <button onClick={() => setOffsets(prev => {
            const n = [...prev]; n[screenId] += 2; return n;
          })} style={{ width: '50px', height: '50px', borderRadius: '25px', border: 'none', background: '#334155', color: 'white' }}>▼</button>
        </div>
      )}
    </div>
  );
};

export default App;