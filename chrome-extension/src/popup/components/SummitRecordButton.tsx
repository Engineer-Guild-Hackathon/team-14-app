import React, { useState, useEffect } from 'react';
import { APIManager, MessageHandler } from '../../utils/messageHandler';

interface Props {
  questId: string;
  isCompleted: boolean;
  onSummitRecorded: (summitId: string) => void;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const SummitRecordButton: React.FC<Props> = ({ 
  questId, 
  isCompleted, 
  onSummitRecorded 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reflection, setReflection] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isPortfolio, setIsPortfolio] = useState(false);
  const [message, setMessage] = useState('');
  const [awardedBadges, setAwardedBadges] = useState<Badge[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // クエスト完了時のみ表示
  if (!isCompleted) {
    return null;
  }

  const handleSummitClick = () => {
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecording(true);

    try {
      // コードスナップショットを取得
      const codeSnapshot = await getCodeSnapshot();
      const implementationTime = await getImplementationTime();
      const techStack = await detectTechStack();

      const summitData = {
        questId,
        reflection: reflection.trim(),
        codeSnapshot,
        implementationTime,
        techStack,
        isPublic,
        isPortfolio
      };

      const response = await APIManager.createSummitRecord(summitData);

      if (response.success) {
        setAwardedBadges(response.data.badges || []);
        setShowSuccess(true);
        setMessage('🎉 登頂記録を作成しました！');
        onSummitRecorded(response.data.summitRecord.id);

        // バッジ獲得アニメーション
        if (response.data.badges?.length > 0) {
          showBadgeAnimation(response.data.badges);
        }

        // 3秒後にフォームを閉じる
        setTimeout(() => {
          setShowForm(false);
          setShowSuccess(false);
          setReflection('');
        }, 3000);
      } else {
        setMessage('登頂記録の作成に失敗しました');
      }
    } catch (error: any) {
      setMessage(error.message || '登頂記録の作成に失敗しました');
    } finally {
      setIsRecording(false);
    }
  };

  const getCodeSnapshot = async (): Promise<any> => {
    try {
      // PCクライアントからプロジェクトのコードを取得
      const response = await MessageHandler.sendToBackground({
        type: 'GET_PROJECT_CODE',
        data: { questId }
      });
      return response.success ? (response.data?.code || {}) : {};
    } catch (error) {
      console.error('Code snapshot error:', error);
      return {};
    }
  };

  const getImplementationTime = async (): Promise<number> => {
    try {
      const response = await MessageHandler.sendToBackground({
        type: 'GET_IMPLEMENTATION_TIME',
        data: { questId }
      });
      return response.success ? (response.data?.time || 0) : 0;
    } catch (error) {
      console.error('Implementation time error:', error);
      return 0;
    }
  };

  const detectTechStack = async (): Promise<string[]> => {
    try {
      const response = await MessageHandler.sendToBackground({
        type: 'DETECT_TECH_STACK',
        data: { questId }
      });
      return response.success ? (response.data?.techStack || []) : [];
    } catch (error) {
      console.error('Tech stack detection error:', error);
      return [];
    }
  };

  const showBadgeAnimation = (badges: Badge[]) => {
    badges.forEach((badge, index) => {
      setTimeout(() => {
        // バッジ獲得のビジュアルエフェクト
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
          <div class="badge-content">
            <span class="badge-icon">${badge.icon}</span>
            <span class="badge-text">バッジ獲得: ${badge.name}</span>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.remove();
        }, 3000);
      }, index * 500);
    });
  };

  if (showSuccess) {
    return (
      <div className="summit-success animate-fadeIn">
        <div className="text-center p-6">
          <div className="mb-4">
            <span className="text-6xl">🏔️</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            登頂成功！
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {message}
          </p>
          
          {awardedBadges.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-slate-700 mb-2">獲得バッジ:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {awardedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1"
                  >
                    <span className="mr-1">{badge.icon}</span>
                    <span className="text-xs font-medium text-yellow-800">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => chrome.tabs.create({ url: 'codeclimb://portfolio' })}
              className="btn-primary text-xs flex-1"
            >
              ポートフォリオで確認
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary text-xs flex-1"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="summit-trigger">
        <button
          onClick={handleSummitClick}
          className="w-full btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-all duration-200"
        >
          <span className="flex items-center justify-center">
            <span className="mr-2 text-lg">🏔️</span>
            登頂記録を作成
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="summit-form animate-fadeIn">
      <div className="p-4 border border-slate-200 rounded-lg bg-white">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
          <span className="mr-2">🏔️</span>
          登頂記録の作成
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              学習の振り返り
            </label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="実装で学んだことや工夫したポイントを記録しましょう..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span className="ml-3 text-sm text-slate-700">
                実装ギャラリーで公開する（他の学習者にシェア）
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={isPortfolio}
                onChange={(e) => setIsPortfolio(e.target.checked)}
              />
              <span className="ml-3 text-sm text-slate-700">
                ポートフォリオに追加する
              </span>
            </label>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('失敗') 
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-success-50 border border-success-200 text-success-700'
            }`}>
              {message}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary flex-1"
              disabled={isRecording}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isRecording}
              className="btn-primary flex-1"
            >
              {isRecording ? (
                <span className="flex items-center justify-center">
                  <div className="spinner w-4 h-4 mr-2"></div>
                  記録中...
                </span>
              ) : (
                '登頂記録を作成'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .badge-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          background: white;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.3s ease-out;
        }

        .badge-content {
          display: flex;
          align-items: center;
          font-weight: 500;
          color: #92400e;
        }

        .badge-icon {
          font-size: 1.5rem;
          margin-right: 8px;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SummitRecordButton;