import React, { useState, useEffect } from 'react';

export function TitleBar() {
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const getPlatform = async () => {
      try {
        if (window.electronAPI?.getPlatform) {
          const platformInfo = await window.electronAPI.getPlatform();
          setPlatform(platformInfo);
        }
      } catch (error) {
        console.error('Failed to get platform:', error);
      }
    };

    getPlatform();
  }, []);

  const handleMinimize = () => {
    window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI.maximize();
  };

  const handleClose = () => {
    window.electronAPI.close();
  };

  return (
    <div className="titlebar h-8 bg-white border-b border-slate-200 flex items-center justify-between px-4 select-none">
      <div className="flex-1 text-center">
        <span className="text-sm font-medium text-slate-600">CodeClimb</span>
      </div>
      
      {platform && platform !== 'darwin' && (
        <div className="flex space-x-1">
          <button
            onClick={handleMinimize}
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-600">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          
          <button
            onClick={handleMaximize}
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-600">
              <path d="M2 2h8v8H2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}