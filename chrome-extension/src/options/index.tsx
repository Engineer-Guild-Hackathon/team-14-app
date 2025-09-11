import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { StorageManager } from '../utils/messageHandler';
import '../popup/popup.css';

interface Settings {
  serverUrl: string;
  autoGenerate: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

function OptionsApp() {
  const [settings, setSettings] = useState<Settings>({
    serverUrl: 'http://localhost:3000',
    autoGenerate: false,
    notifications: true,
    theme: 'auto'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await StorageManager.getSync('settings');
      if (stored) {
        setSettings({ ...settings, ...stored });
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await StorageManager.setSync('settings', settings);
      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('設定の保存に失敗しました');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      const defaultSettings: Settings = {
        serverUrl: 'http://localhost:3000',
        autoGenerate: false,
        notifications: true,
        theme: 'auto'
      };
      setSettings(defaultSettings);
    }
  };

  const clearAllData = async () => {
    if (confirm('すべてのデータを削除しますか？この操作は元に戻せません。')) {
      await StorageManager.clear();
      setMessage('すべてのデータを削除しました');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">CodeClimb 設定</h1>
        <p className="text-slate-600">拡張機能の動作をカスタマイズできます</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('失敗') || message.includes('削除')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-success-50 border border-success-200 text-success-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">接続設定</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                サーバーURL
              </label>
              <input
                type="url"
                className="input max-w-md"
                value={settings.serverUrl}
                onChange={(e) => setSettings(prev => ({ ...prev, serverUrl: e.target.value }))}
                placeholder="http://localhost:3000"
              />
              <p className="text-xs text-slate-500 mt-1">
                CodeClimbバックエンドサーバーのURLを指定してください
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">動作設定</h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={settings.autoGenerate}
                onChange={(e) => setSettings(prev => ({ ...prev, autoGenerate: e.target.checked }))}
              />
              <span className="ml-3 text-sm text-slate-700">
                技術記事を開いた時に自動でクエスト生成を提案する
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={settings.notifications}
                onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
              />
              <span className="ml-3 text-sm text-slate-700">
                通知を有効にする
              </span>
            </label>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">表示設定</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              テーマ
            </label>
            <select
              className="select max-w-xs"
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as any }))}
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="auto">システムに従う</option>
            </select>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">データ管理</h2>
          
          <div className="space-y-4">
            <button
              onClick={resetSettings}
              className="btn-secondary"
            >
              設定をデフォルトに戻す
            </button>

            <button
              onClick={clearAllData}
              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              すべてのデータを削除
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">アプリ情報</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">バージョン</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">リリース日</span>
              <span className="font-medium">2024年</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              CodeClimb Chrome Extension - 技術記事から学習クエストを生成し、実装をサポートします
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end space-x-3">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);