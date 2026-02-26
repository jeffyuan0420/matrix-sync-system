import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 這裡的 'root' 必須與 index.html 中的 <div id="root"></div> 完全對應
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("找不到 root 元素，請檢查 index.html 是否包含 <div id='root'></div>");
}