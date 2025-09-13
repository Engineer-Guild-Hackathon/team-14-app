import React, { useState, useEffect } from 'react';
import { APIClient } from '../utils/api';

interface Props {
  implementationId: string;
  mode: 'review' | 'request';
}

interface ReviewRequest {
  id: string;
  implementationId: string;
  requesterId: string;
  requesterName: string;
  title: string;
  description: string;
  codeSnapshot: {
    files: { path: string; content: string }[];
  };
  techStack: string[];
  difficulty: number;
  requestedAt: string;
  deadline?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  overallRating: number;
  readability: number;
  approach: number;
  errorHandling: number;
  performance: number;
  security: number;
  comments: ReviewComment[];
  summary: string;
  improvements: string[];
  positives: string[];
  createdAt: string;
  helpful: number;
  isHelpful?: boolean;
}

interface ReviewComment {
  id: string;
  filePath: string;
  lineNumber: number;
  content: string;
  type: 'suggestion' | 'issue' | 'compliment';
  resolved?: boolean;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  reviewPoints: number;
  reviewerRank: number;
  badges: string[];
}

const PeerReview: React.FC<Props> = ({ implementationId, mode }) => {
  const [reviewRequest, setReviewRequest] = useState<ReviewRequest | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review form states
  const [reviewForm, setReviewForm] = useState({
    overallRating: 5,
    readability: 5,
    approach: 5,
    errorHandling: 5,
    performance: 5,
    security: 5,
    summary: '',
    improvements: [''],
    positives: ['']
  });
  const [activeComments, setActiveComments] = useState<{ [key: string]: string }>({});
  const [showCommentForm, setShowCommentForm] = useState<{ filePath: string; lineNumber: number } | null>(null);

  useEffect(() => {
    loadReviewData();
  }, [implementationId, mode]);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      
      const [requestResponse, reviewsResponse, statsResponse] = await Promise.all([
        APIClient.get(`/api/reviews/requests/${implementationId}`),
        APIClient.get(`/api/reviews/${implementationId}`),
        APIClient.get(`/api/reviews/stats/me`)
      ]);

      setReviewRequest(requestResponse.data);
      setReviews(reviewsResponse.data.reviews);
      setMyReview(reviewsResponse.data.myReview);
      setStats(statsResponse.data);

      if (requestResponse.data?.codeSnapshot?.files?.length > 0) {
        setSelectedFile(requestResponse.data.codeSnapshot.files[0].path);
      }
    } catch (error) {
      console.error('Review data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    try {
      setIsSubmitting(true);

      const reviewData = {
        implementationId,
        ...reviewForm,
        improvements: reviewForm.improvements.filter(i => i.trim()),
        positives: reviewForm.positives.filter(p => p.trim()),
        comments: Object.entries(activeComments).map(([key, content]) => {
          const [filePath, lineNumber] = key.split(':');
          return {
            filePath,
            lineNumber: parseInt(lineNumber),
            content,
            type: 'suggestion' as const
          };
        }).filter(c => c.content.trim())
      };

      const response = await APIClient.post('/api/reviews', reviewData);
      
      if (response.data.success) {
        await loadReviewData();
        resetReviewForm();
        setActiveTab('reviews');
      }
    } catch (error) {
      console.error('Review submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetReviewForm = () => {
    setReviewForm({
      overallRating: 5,
      readability: 5,
      approach: 5,
      errorHandling: 5,
      performance: 5,
      security: 5,
      summary: '',
      improvements: [''],
      positives: ['']
    });
    setActiveComments({});
  };

  const addComment = (filePath: string, lineNumber: number, content: string, type: 'suggestion' | 'issue' | 'compliment') => {
    const key = `${filePath}:${lineNumber}`;
    setActiveComments(prev => ({ ...prev, [key]: content }));
    setShowCommentForm(null);
  };

  const markHelpful = async (reviewId: string) => {
    try {
      await APIClient.post(`/api/reviews/${reviewId}/helpful`);
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                helpful: review.isHelpful ? review.helpful - 1 : review.helpful + 1,
                isHelpful: !review.isHelpful 
              }
            : review
        )
      );
    } catch (error) {
      console.error('Mark helpful error:', error);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-100';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const renderRatingStars = (rating: number, onChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={`w-6 h-6 text-sm ${
              star <= rating 
                ? 'text-yellow-500' 
                : 'text-slate-300'
            } ${onChange ? 'hover:text-yellow-400 cursor-pointer' : 'cursor-default'}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const renderCodeWithComments = (file: { path: string; content: string }) => {
    const lines = file.content.split('\n');
    
    return (
      <div className="code-viewer bg-slate-900 text-slate-100 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-slate-300 text-sm">{file.path}</span>
        </div>
        <div className="p-4">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const commentKey = `${file.path}:${lineNumber}`;
            const hasComment = activeComments[commentKey];
            
            return (
              <div key={lineNumber} className="flex group">
                <div className="w-12 text-xs text-slate-500 text-right pr-4 select-none">
                  {lineNumber}
                </div>
                <div className="flex-1">
                  <pre className="text-sm font-mono">{line}</pre>
                  {hasComment && (
                    <div className="mt-1 p-2 bg-blue-900 border-l-4 border-blue-500 rounded">
                      <div className="text-xs text-blue-200">{hasComment}</div>
                    </div>
                  )}
                </div>
                {mode === 'review' && !myReview && (
                  <button
                    onClick={() => setShowCommentForm({ filePath: file.path, lineNumber })}
                    className="opacity-0 group-hover:opacity-100 ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                  >
                    💬
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="peer-review">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">レビューデータを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="peer-review p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'review' ? 'ピアレビュー実施' : 'レビュー依頼'}
          </h1>
          {reviewRequest && (
            <p className="text-slate-600 mt-1">{reviewRequest.title}</p>
          )}
        </div>
        {stats && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-primary-600">{stats.reviewPoints}</div>
              <div className="text-slate-500">ポイント</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">#{stats.reviewerRank}</div>
              <div className="text-slate-500">順位</div>
            </div>
            <div className="flex space-x-1">
              {stats.badges.slice(0, 3).map((badge, index) => (
                <span key={index} className="text-lg">{badge}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: '概要', icon: '📋' },
            { key: 'code', label: 'コード', icon: '💻' },
            { key: 'reviews', label: `レビュー (${reviews.length})`, icon: '💬' },
            ...(mode === 'review' && !myReview ? [{ key: 'submit', label: 'レビュー作成', icon: '✍️' }] : [])
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && reviewRequest && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{reviewRequest.title}</h3>
                <p className="text-slate-600 mt-1">by {reviewRequest.requesterName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRatingColor(reviewRequest.difficulty * 2)}`}>
                  難易度 {reviewRequest.difficulty}/5
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reviewRequest.status === 'open' ? 'bg-green-100 text-green-800' :
                  reviewRequest.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {reviewRequest.status === 'open' ? '募集中' : 
                   reviewRequest.status === 'in_progress' ? 'レビュー中' : '完了'}
                </span>
              </div>
            </div>
            
            <p className="text-slate-700 mb-4">{reviewRequest.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {reviewRequest.techStack.map((tech, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>依頼日: {new Date(reviewRequest.requestedAt).toLocaleDateString('ja-JP')}</span>
              {reviewRequest.deadline && (
                <span>期限: {new Date(reviewRequest.deadline).toLocaleDateString('ja-JP')}</span>
              )}
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">レビューサマリー</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {(reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">総合評価</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(reviews.reduce((sum, r) => sum + r.readability, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">可読性</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(reviews.reduce((sum, r) => sum + r.approach, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">アプローチ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {(reviews.reduce((sum, r) => sum + r.errorHandling, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">エラー対応</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(reviews.reduce((sum, r) => sum + r.performance, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">パフォーマンス</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(reviews.reduce((sum, r) => sum + r.security, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">セキュリティ</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'code' && reviewRequest && (
        <div className="space-y-4">
          {reviewRequest.codeSnapshot.files.length > 1 && (
            <div className="flex space-x-2 mb-4">
              {reviewRequest.codeSnapshot.files.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedFile(file.path)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedFile === file.path
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {file.path.split('/').pop()}
                </button>
              ))}
            </div>
          )}
          
          {(() => {
            const file = reviewRequest.codeSnapshot.files.find(f => f.path === selectedFile);
            return file ? renderCodeWithComments(file) : null;
          })()}

          {/* Comment Form Modal */}
          {showCommentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96 max-w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">コメントを追加</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {showCommentForm.filePath}:{showCommentForm.lineNumber}行目
                  </label>
                  <textarea
                    className="w-full p-3 border border-slate-300 rounded-lg resize-none"
                    rows={3}
                    placeholder="改善提案やコメントを入力..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        const content = (e.target as HTMLTextAreaElement).value;
                        if (content.trim()) {
                          addComment(showCommentForm.filePath, showCommentForm.lineNumber, content, 'suggestion');
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCommentForm(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const content = textarea?.value;
                      if (content?.trim()) {
                        addComment(showCommentForm.filePath, showCommentForm.lineNumber, content, 'suggestion');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">💬</span>
              <p className="text-slate-600">まだレビューがありません</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-slate-300 rounded-full mr-3"></div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{review.reviewerName}</h4>
                      <p className="text-sm text-slate-600">
                        {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">総合評価</div>
                      <div className="flex items-center">
                        {renderRatingStars(review.overallRating)}
                        <span className="ml-2 text-sm font-medium">{review.overallRating}/10</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <div className="font-medium text-blue-600">{review.readability}/10</div>
                    <div className="text-xs text-slate-600">可読性</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">{review.approach}/10</div>
                    <div className="text-xs text-slate-600">アプローチ</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-yellow-600">{review.errorHandling}/10</div>
                    <div className="text-xs text-slate-600">エラー対応</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">{review.performance}/10</div>
                    <div className="text-xs text-slate-600">パフォーマンス</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">{review.security}/10</div>
                    <div className="text-xs text-slate-600">セキュリティ</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <h5 className="font-medium text-slate-900 mb-1">レビューコメント</h5>
                    <p className="text-slate-700 text-sm">{review.summary}</p>
                  </div>

                  {review.positives.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-900 mb-1">✅ 良い点</h5>
                      <ul className="text-sm text-green-800 space-y-1">
                        {review.positives.map((positive, index) => (
                          <li key={index}>• {positive}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.improvements.length > 0 && (
                    <div>
                      <h5 className="font-medium text-orange-900 mb-1">🔧 改善提案</h5>
                      <ul className="text-sm text-orange-800 space-y-1">
                        {review.improvements.map((improvement, index) => (
                          <li key={index}>• {improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    onClick={() => markHelpful(review.id)}
                    className={`flex items-center space-x-2 text-sm transition-colors ${
                      review.isHelpful 
                        ? 'text-primary-600' 
                        : 'text-slate-500 hover:text-primary-600'
                    }`}
                  >
                    <span>{review.isHelpful ? '👍' : '👍🏻'}</span>
                    <span>参考になった ({review.helpful})</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'submit' && mode === 'review' && !myReview && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">レビューを作成</h3>
          
          <form onSubmit={(e) => { e.preventDefault(); submitReview(); }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">総合評価</label>
                {renderRatingStars(reviewForm.overallRating, (rating) => 
                  setReviewForm(prev => ({ ...prev, overallRating: rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">可読性</label>
                {renderRatingStars(reviewForm.readability, (rating) => 
                  setReviewForm(prev => ({ ...prev, readability: rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">アプローチ</label>
                {renderRatingStars(reviewForm.approach, (rating) => 
                  setReviewForm(prev => ({ ...prev, approach: rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">エラー対応</label>
                {renderRatingStars(reviewForm.errorHandling, (rating) => 
                  setReviewForm(prev => ({ ...prev, errorHandling: rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">パフォーマンス</label>
                {renderRatingStars(reviewForm.performance, (rating) => 
                  setReviewForm(prev => ({ ...prev, performance: rating }))
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">セキュリティ</label>
                {renderRatingStars(reviewForm.security, (rating) => 
                  setReviewForm(prev => ({ ...prev, security: rating }))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                レビューコメント
              </label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-lg resize-none"
                rows={4}
                placeholder="実装についての総合的なコメントを記入してください..."
                value={reviewForm.summary}
                onChange={(e) => setReviewForm(prev => ({ ...prev, summary: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  ✅ 良い点
                </label>
                {reviewForm.positives.map((positive, index) => (
                  <div key={index} className="mb-2">
                    <textarea
                      className="w-full p-3 border border-green-300 rounded-lg resize-none bg-green-50"
                      rows={2}
                      placeholder="良い点を記入..."
                      value={positive}
                      onChange={(e) => {
                        const newPositives = [...reviewForm.positives];
                        newPositives[index] = e.target.value;
                        setReviewForm(prev => ({ ...prev, positives: newPositives }));
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setReviewForm(prev => ({ 
                    ...prev, 
                    positives: [...prev.positives, ''] 
                  }))}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  + 良い点を追加
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-700 mb-2">
                  🔧 改善提案
                </label>
                {reviewForm.improvements.map((improvement, index) => (
                  <div key={index} className="mb-2">
                    <textarea
                      className="w-full p-3 border border-orange-300 rounded-lg resize-none bg-orange-50"
                      rows={2}
                      placeholder="改善提案を記入..."
                      value={improvement}
                      onChange={(e) => {
                        const newImprovements = [...reviewForm.improvements];
                        newImprovements[index] = e.target.value;
                        setReviewForm(prev => ({ ...prev, improvements: newImprovements }));
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setReviewForm(prev => ({ 
                    ...prev, 
                    improvements: [...prev.improvements, ''] 
                  }))}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  + 改善提案を追加
                </button>
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={resetReviewForm}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                リセット
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reviewForm.summary.trim()}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'レビュー送信中...' : 'レビューを送信'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PeerReview;