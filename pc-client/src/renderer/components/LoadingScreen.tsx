import React from 'react';

export function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">CodeClimb を起動中...</p>
      </div>
    </div>
  );
}