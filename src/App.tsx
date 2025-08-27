import { useState } from 'react';
import { AppMode } from './types';
import type { AppMode as AppModeType } from './types';
import SingleMode from './components/SingleMode';
import BatchMode from './components/BatchMode';
import OCRBatchMode from './components/OCRBatchMode';
import './App.css';

function App() {
  const [currentMode, setCurrentMode] = useState<AppModeType>(AppMode.SINGLE);

  return (
    <div className="app">
      <header className="app-header">
        <h1>身份证PDF合并工具</h1>
        <p className="author-info">作者：海边的飞行器</p>
        <p>将身份证正反面图片合并成PDF文件</p>
        
        <div className="mode-switcher">
          <button 
            className={`mode-button ${currentMode === AppMode.SINGLE ? 'active' : ''}`}
            onClick={() => setCurrentMode(AppMode.SINGLE)}
          >
            单个任务模式
          </button>
          <button 
            className={`mode-button ${currentMode === AppMode.BATCH ? 'active' : ''}`}
            onClick={() => setCurrentMode(AppMode.BATCH)}
          >
            批处理模式
          </button>
          <button 
            className={`mode-button ${currentMode === AppMode.OCR_BATCH ? 'active' : ''}`}
            onClick={() => setCurrentMode(AppMode.OCR_BATCH)}
          >
            OCR批处理模式
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentMode === AppMode.SINGLE ? (
          <SingleMode />
        ) : currentMode === AppMode.BATCH ? (
          <BatchMode />
        ) : (
          <OCRBatchMode />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 身份证PDF合并工具 - 安全便捷的文档处理</p>
      </footer>
    </div>
  );
}

export default App
