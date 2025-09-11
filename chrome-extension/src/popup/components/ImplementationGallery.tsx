import React, { useState, useEffect } from 'react';
import { APIManager } from '../../utils/messageHandler';

interface Props {
  articleUrl: string;
  currentImplementation?: Implementation;
}

interface Implementation {
  id: string;
  title: string;
  description: string;
  code: any;
  approach: string;
  techStack: string[];
  difficulty: number;
  implementTime: number;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  comments: number;
  isLiked?: boolean;
  createdAt: string;
}

const ImplementationGallery: React.FC<Props> = ({ 
  articleUrl, 
  currentImplementation 
}) => {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [selectedImpl, setSelectedImpl] = useState<Implementation | null>(null);
  const [filter, setFilter] = useState<'popular' | 'recent' | 'following'>('popular');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadImplementations();
  }, [articleUrl, filter]);

  const loadImplementations = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await APIManager.getImplementationsByArticle(articleUrl, {
        sort: filter === 'popular' ? 'popular' : 'recent',
        limit: 10
      });

      if (response.success) {
        setImplementations(response.data.implementations || []);
      } else {
        setError('実装例の取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '実装例の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (implementationId: string) => {
    try {
      const response = await APIManager.likeImplementation(implementationId);
      
      if (response.success) {
        // 実装リストを更新
        setImplementations(prev => 
          prev.map(impl => 
            impl.id === implementationId 
              ? { 
                  ...impl, 
                  likes: response.data.liked ? impl.likes + 1 : impl.likes - 1,
                  isLiked: response.data.liked
                }
              : impl
          )
        );
      }
    } catch (error: any) {
      console.error('Like error:', error);
    }
  };

  const copyCode = (code: any) => {
    const codeString = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
    navigator.clipboard.writeText(codeString).then(() => {
      // 一時的な成功メッセージ表示
      const notification = document.createElement('div');
      notification.textContent = 'コードをコピーしました！';
      notification.className = 'fixed top-4 right-4 bg-success-500 text-white px-4 py-2 rounded-lg z-50';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    });
  };

  const createQuestFromImplementation = async (impl: Implementation) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_QUEST_FROM_IMPLEMENTATION',
        data: {
          title: `${impl.title}のアプローチを試す`,
          description: `${impl.user.name}さんの実装を参考に新しいアプローチで挑戦`,
          articleUrl,
          referenceImplementation: impl.id,
          suggestedTechStack: impl.techStack
        }
      });

      if (response.success) {
        // PCクライアントに通知
        chrome.tabs.create({ url: 'codeclimb://quest/' + response.data.questId });
      }
    } catch (error: any) {
      console.error('Create quest error:', error);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-yellow-600 bg-yellow-100';
      case 3: return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 1: return '初級';
      case 2: return '中級';
      case 3: return '上級';
      default: return '未設定';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins > 0 ? mins + '分' : ''}`;
  };

  if (loading) {
    return (
      <div className="implementation-gallery">
        <div className="text-center p-6">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-slate-600">実装例を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="implementation-gallery">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={loadImplementations}
            className="mt-2 text-red-600 hover:text-red-700 text-sm underline"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (showDetails && selectedImpl) {
    return (
      <div className="implementation-details animate-fadeIn">
        <div className="border border-slate-200 rounded-lg bg-white">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">{selectedImpl.title}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <span className="flex items-center">
                <span className="w-6 h-6 bg-slate-300 rounded-full mr-2"></span>
                {selectedImpl.user.name}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedImpl.difficulty)}`}>
                {getDifficultyText(selectedImpl.difficulty)}
              </span>
              <span>{formatTime(selectedImpl.implementTime)}</span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">実装アプローチ</h4>
              <p className="text-sm text-slate-700">{selectedImpl.approach}</p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">使用技術</h4>
              <div className="flex flex-wrap gap-2">
                {selectedImpl.techStack.map((tech, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">コードプレビュー</h4>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
                <pre className="text-xs">
                  {typeof selectedImpl.code === 'string' 
                    ? selectedImpl.code.substring(0, 200) + '...'
                    : JSON.stringify(selectedImpl.code, null, 2).substring(0, 200) + '...'
                  }
                </pre>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => copyCode(selectedImpl.code)}
                className="btn-secondary text-xs flex-1"
              >
                コードをコピー
              </button>
              <button
                onClick={() => createQuestFromImplementation(selectedImpl)}
                className="btn-primary text-xs flex-1"
              >
                これも試してみる
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex space-x-4">
                <button
                  onClick={() => handleLike(selectedImpl.id)}
                  className={`flex items-center text-sm ${
                    selectedImpl.isLiked ? 'text-red-600' : 'text-slate-600 hover:text-red-600'
                  }`}
                >
                  <span className="mr-1">{selectedImpl.isLiked ? '❤️' : '🤍'}</span>
                  {selectedImpl.likes}
                </button>
                <span className="flex items-center text-sm text-slate-600">
                  <span className="mr-1">💬</span>
                  {selectedImpl.comments}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(selectedImpl.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="implementation-gallery">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">絶景実装ギャラリー</h3>
          <span className="text-xs text-slate-500">{implementations.length}件の実装</span>
        </div>

        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => setFilter('popular')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === 'popular'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            人気順
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === 'recent'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            最新順
          </button>
        </div>
      </div>

      {implementations.length === 0 ? (
        <div className="text-center p-6">
          <span className="text-4xl mb-3 block">🏔️</span>
          <p className="text-slate-600 text-sm">
            まだ実装例がありません。<br />
            最初の登頂者になりましょう！
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {implementations.map((impl) => (
            <div
              key={impl.id}
              onClick={() => {
                setSelectedImpl(impl);
                setShowDetails(true);
              }}
              className="implementation-card p-3 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                  {impl.title}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(impl.difficulty)}`}>
                  {getDifficultyText(impl.difficulty)}
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                {impl.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-600">
                  <span className="w-4 h-4 bg-slate-300 rounded-full mr-2"></span>
                  {impl.user.name}
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center">
                    <span className="mr-1">{impl.isLiked ? '❤️' : '🤍'}</span>
                    {impl.likes}
                  </span>
                  <span>{formatTime(impl.implementTime)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {impl.techStack.slice(0, 3).map((tech, index) => (
                  <span
                    key={index}
                    className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                  >
                    {tech}
                  </span>
                ))}
                {impl.techStack.length > 3 && (
                  <span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                    +{impl.techStack.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImplementationGallery;