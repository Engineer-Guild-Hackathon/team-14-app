import React, { useState, useEffect } from 'react';
import { Line, Radar, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { APIClient } from '../utils/api';

// Chart.js registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  studentId: string;
  timeRange: 'week' | 'month' | 'all';
  viewType: 'individual' | 'class';
}

interface LearningData {
  studyTime: {
    dates: string[];
    hours: number[];
  };
  successRate: {
    dates: string[];
    rates: number[];
  };
  bottlenecks: {
    category: string;
    frequency: number;
    difficulty: number;
  }[];
  skillRadar: {
    skills: string[];
    scores: number[];
  };
  codeQuality: {
    dates: string[];
    scores: number[];
  };
  implementationPaths: {
    articles: string[];
    implementations: number[];
    connections: { from: string; to: string; weight: number }[];
  };
}

interface StudentProgress {
  totalHours: number;
  completedQuests: number;
  averageScore: number;
  streak: number;
  badges: number;
  rank: number;
}

const LearningAnalytics: React.FC<Props> = ({ studentId, timeRange, viewType }) => {
  const [data, setData] = useState<LearningData | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBottleneck, setSelectedBottleneck] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [studentId, timeRange, viewType]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [analyticsResponse, progressResponse] = await Promise.all([
        APIClient.get(`/api/analytics/learning/${studentId}`, {
          params: { timeRange, viewType }
        }),
        APIClient.get(`/api/analytics/progress/${studentId}`)
      ]);

      setData(analyticsResponse.data);
      setProgress(progressResponse.data);
    } catch (error: any) {
      console.error('Analytics data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTimelineChart = () => {
    if (!data) return null;

    const chartData = {
      labels: data.studyTime.dates,
      datasets: [
        {
          label: '学習時間（時間）',
          data: data.studyTime.hours,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '成功率（%）',
          data: data.successRate.rates,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ],
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: '学習時間と成功率の推移',
        },
        tooltip: {
          callbacks: {
            afterLabel: (context: any) => {
              if (context.datasetIndex === 0) {
                return `${context.parsed.y}時間の学習`;
              } else {
                return `成功率${context.parsed.y}%`;
              }
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: '学習時間（時間）'
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: '成功率（%）'
          },
          grid: {
            drawOnChartArea: false,
          },
          min: 0,
          max: 100
        },
      },
      onClick: (event: any, elements: any) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          setSelectedPeriod(data.studyTime.dates[index]);
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  const renderSkillRadar = () => {
    if (!data) return null;

    const chartData = {
      labels: data.skillRadar.skills,
      datasets: [
        {
          label: 'スキルレベル',
          data: data.skillRadar.scores,
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          pointBackgroundColor: 'rgba(168, 85, 247, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(168, 85, 247, 1)',
        }
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'スキル習得レーダーチャート',
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
        }
      }
    };

    return <Radar data={chartData} options={options} />;
  };

  const renderBottleneckHeatmap = () => {
    if (!data) return null;

    const chartData = {
      labels: data.bottlenecks.map(b => b.category),
      datasets: [
        {
          label: 'つまずき頻度',
          data: data.bottlenecks.map(b => b.frequency),
          backgroundColor: data.bottlenecks.map(b => 
            b.difficulty > 7 ? 'rgba(239, 68, 68, 0.8)' :
            b.difficulty > 4 ? 'rgba(245, 158, 11, 0.8)' :
            'rgba(34, 197, 94, 0.8)'
          ),
          borderColor: data.bottlenecks.map(b => 
            b.difficulty > 7 ? 'rgba(239, 68, 68, 1)' :
            b.difficulty > 4 ? 'rgba(245, 158, 11, 1)' :
            'rgba(34, 197, 94, 1)'
          ),
          borderWidth: 1,
        }
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'つまずきポイント分析',
        },
        tooltip: {
          callbacks: {
            afterLabel: (context: any) => {
              const bottleneck = data.bottlenecks[context.dataIndex];
              return `難易度: ${bottleneck.difficulty}/10`;
            }
          }
        }
      },
      onClick: (event: any, elements: any) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          setSelectedBottleneck(data.bottlenecks[index].category);
        }
      }
    };

    return <Bar data={chartData} options={options} />;
  };

  const renderCodeQualityChart = () => {
    if (!data) return null;

    const chartData = {
      labels: data.codeQuality.dates,
      datasets: [
        {
          label: 'コード品質スコア',
          data: data.codeQuality.scores,
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'コード品質向上曲線',
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: '品質スコア'
          }
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  const renderImplementationPath = () => {
    if (!data) return null;

    // Simple implementation path visualization
    return (
      <div className="implementation-path">
        <h4 className="font-semibold text-slate-900 mb-4">学習経路の可視化</h4>
        <div className="space-y-3">
          {data.implementationPaths.articles.map((article, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-32 p-2 bg-blue-100 rounded text-xs text-blue-800 truncate">
                {article}
              </div>
              <div className="flex-1 h-px bg-slate-300 relative">
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                  →
                </div>
              </div>
              <div className="w-16 p-2 bg-green-100 rounded text-xs text-green-800 text-center">
                {data.implementationPaths.implementations[index]}件
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportAnalytics = async () => {
    try {
      const response = await APIClient.get(`/api/analytics/export/${studentId}`, {
        params: { timeRange, format: 'pdf' },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `learning-analytics-${studentId}-${timeRange}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className="learning-analytics">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">学習分析データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-analytics p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">学習分析</h1>
        <div className="flex space-x-3">
          <select 
            value={timeRange} 
            onChange={(e) => window.location.href = `?timeRange=${e.target.value}&viewType=${viewType}`}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
            <option value="all">全期間</option>
          </select>
          <button
            onClick={exportAnalytics}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
          >
            📊 レポート出力
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      {progress && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-blue-600">{progress.totalHours}h</div>
            <div className="text-sm text-slate-600">総学習時間</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-green-600">{progress.completedQuests}</div>
            <div className="text-sm text-slate-600">完了クエスト</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-purple-600">{progress.averageScore}%</div>
            <div className="text-sm text-slate-600">平均スコア</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-orange-600">{progress.streak}日</div>
            <div className="text-sm text-slate-600">連続学習</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-yellow-600">{progress.badges}</div>
            <div className="text-sm text-slate-600">獲得バッジ</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-red-600">#{progress.rank}</div>
            <div className="text-sm text-slate-600">クラス順位</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: '概要', icon: '📊' },
            { key: 'timeline', label: 'タイムライン', icon: '📈' },
            { key: 'skills', label: 'スキル', icon: '🎯' },
            { key: 'bottlenecks', label: 'つまずき分析', icon: '🔍' },
            { key: 'quality', label: 'コード品質', icon: '⚡' },
            { key: 'path', label: '学習経路', icon: '🗺️' }
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
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold mb-4">学習サマリー</h3>
              <div className="h-64">
                {renderTimelineChart()}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold mb-4">スキルバランス</h3>
              <div className="h-64">
                {renderSkillRadar()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="h-96">
              {renderTimelineChart()}
            </div>
            {selectedPeriod && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">
                  {selectedPeriod}の詳細
                </h4>
                <p className="text-blue-800 text-sm">
                  この日の学習内容と成果を詳しく表示します。
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="h-96">
              {renderSkillRadar()}
            </div>
          </div>
        )}

        {activeTab === 'bottlenecks' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="h-80">
                {renderBottleneckHeatmap()}
              </div>
            </div>
            {selectedBottleneck && (
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <h3 className="text-lg font-semibold mb-4">
                  「{selectedBottleneck}」の詳細分析
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">よくあるエラー</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• 構文エラー (45%)</li>
                      <li>• ロジックエラー (30%)</li>
                      <li>• 型エラー (25%)</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">推奨学習</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 基礎文法の復習</li>
                      <li>• デバッグ手法の練習</li>
                      <li>• コードレビューの実施</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">参考資料</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 公式ドキュメント</li>
                      <li>• チュートリアル動画</li>
                      <li>• 練習問題集</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="h-96">
              {renderCodeQualityChart()}
            </div>
          </div>
        )}

        {activeTab === 'path' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            {renderImplementationPath()}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningAnalytics;