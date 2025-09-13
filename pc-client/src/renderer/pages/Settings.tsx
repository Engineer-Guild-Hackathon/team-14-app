import React from 'react';

export function Settings() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">設定</h1>
        
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">一般設定</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  テーマ
                </label>
                <select className="input">
                  <option>ライト</option>
                  <option>ダーク</option>
                  <option>システムに合わせる</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  言語
                </label>
                <select className="input">
                  <option>日本語</option>
                  <option>English</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">通知設定</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <span className="ml-2 text-sm text-slate-700">デスクトップ通知を有効にする</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <span className="ml-2 text-sm text-slate-700">クエスト完了時に音を鳴らす</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <span className="ml-2 text-sm text-slate-700">ファイル変更の通知</span>
              </label>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">アプリ情報</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">バージョン</span>
                <span className="text-sm font-medium text-slate-900">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">プラットフォーム</span>
                <span className="text-sm font-medium text-slate-900">macOS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}