import React, { useState, useRef, useEffect } from 'react';

interface CodeBlock {
  id: string;
  content: string;
  order: number;
  isCorrect?: boolean;
}

interface Props {
  blocks: CodeBlock[];
  onSubmit: (arrangement: string[]) => void;
  hint?: string;
  solution?: string[];
  onComplete?: () => void;
}

const CodeArrangement: React.FC<Props> = ({ 
  blocks, 
  onSubmit, 
  hint, 
  solution,
  onComplete 
}) => {
  const [arrangedBlocks, setArrangedBlocks] = useState<CodeBlock[]>(blocks);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CodeBlock | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const dragItemRef = useRef<HTMLDivElement>(null);
  const dragNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ブロックをシャッフルして初期化
    const shuffled = [...blocks].sort(() => Math.random() - 0.5);
    setArrangedBlocks(shuffled);
  }, [blocks]);

  const handleDragStart = (e: React.DragEvent, block: CodeBlock, index: number) => {
    setDraggedItem(block);
    setIsDragging(true);
    
    // ドラッグイメージのカスタマイズ
    if (dragItemRef.current) {
      e.dataTransfer.setDragImage(dragItemRef.current, 0, 0);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', block.content);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const dragIndex = arrangedBlocks.findIndex(block => block.id === draggedItem.id);
    
    if (dragIndex !== dropIndex) {
      const newBlocks = [...arrangedBlocks];
      
      // 要素を移動
      const draggedBlock = newBlocks.splice(dragIndex, 1)[0];
      newBlocks.splice(dropIndex, 0, draggedBlock);
      
      setArrangedBlocks(newBlocks);
    }

    setDragOverIndex(null);
  };

  const submitArrangement = async () => {
    const arrangement = arrangedBlocks.map(block => block.id);
    setAttempts(prev => prev + 1);

    // 正解チェック
    if (solution) {
      const isCorrectAnswer = arrangement.every((id, index) => id === solution[index]);
      setIsCorrect(isCorrectAnswer);
      
      if (isCorrectAnswer) {
        setFeedback('🎉 正解です！コードが正しく並べ替えられました。');
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      } else {
        setFeedback(`❌ 不正解です。もう一度挑戦してみましょう。（${attempts + 1}回目の挑戦）`);
        
        // 3回以上間違えたらヒントを表示
        if (attempts >= 2 && hint) {
          setShowHint(true);
        }
      }
    } else {
      // 解答がない場合は提出のみ
      setFeedback('回答を送信しました。');
    }

    // 親コンポーネントに結果を送信
    onSubmit(arrangement);
  };

  const resetArrangement = () => {
    const shuffled = [...blocks].sort(() => Math.random() - 0.5);
    setArrangedBlocks(shuffled);
    setFeedback('');
    setIsCorrect(false);
    setShowHint(false);
  };

  const showSolution = () => {
    if (!solution) return;
    
    const solutionBlocks = solution.map(id => 
      blocks.find(block => block.id === id)!
    );
    setArrangedBlocks(solutionBlocks);
    setFeedback('💡 解答を表示しました。実行順序を確認してみましょう。');
  };

  return (
    <div className="code-arrangement">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">コード並べ替えパズル</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">試行回数: {attempts}</span>
            {attempts > 0 && !isCorrect && (
              <button
                onClick={resetArrangement}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                リセット
              </button>
            )}
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-3">
          コードブロックを正しい実行順序に並べ替えてください
        </p>
      </div>

      <div className="arrangement-area">
        <div className="space-y-2 mb-4">
          {arrangedBlocks.map((block, index) => (
            <div
              key={block.id}
              draggable={!isCorrect}
              onDragStart={(e) => handleDragStart(e, block, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`code-block p-3 border rounded-lg cursor-move transition-all duration-200 ${
                draggedItem?.id === block.id
                  ? 'opacity-50 transform rotate-2'
                  : 'opacity-100'
              } ${
                dragOverIndex === index
                  ? 'border-primary-300 bg-primary-50 transform scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              } ${
                isCorrect
                  ? 'cursor-default border-green-200 bg-green-50'
                  : ''
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-6 h-6 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-xs font-medium text-slate-600">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-grow">
                  <code className="text-sm text-slate-800 font-mono block whitespace-pre-wrap">
                    {block.content}
                  </code>
                </div>
                {!isCorrect && (
                  <div className="flex-shrink-0 ml-2 text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 3a1 1 0 011 1v4a1 1 0 11-2 0V4a1 1 0 011-1zM6 8a1 1 0 100 2h4a1 1 0 100-2H6z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ドラッグ用のプレビューイメージ（非表示） */}
        <div
          ref={dragItemRef}
          className="fixed opacity-0 pointer-events-none"
          style={{ top: '-1000px' }}
        >
          {draggedItem && (
            <div className="p-2 bg-white border border-slate-300 rounded shadow-lg max-w-xs">
              <code className="text-sm text-slate-800 font-mono">
                {draggedItem.content}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* フィードバックエリア */}
      {feedback && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${
          isCorrect
            ? 'bg-green-50 border border-green-200 text-green-700'
            : feedback.includes('不正解')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {feedback}
        </div>
      )}

      {/* ヒント表示 */}
      {showHint && hint && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <h4 className="font-medium text-yellow-800 mb-1">💡 ヒント</h4>
          <p className="text-sm text-yellow-700">{hint}</p>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="flex space-x-2">
        {!isCorrect && (
          <button
            onClick={submitArrangement}
            className="btn-primary flex-1"
            disabled={isDragging}
          >
            回答をチェック
          </button>
        )}
        
        {attempts >= 3 && solution && !isCorrect && (
          <button
            onClick={showSolution}
            className="btn-secondary"
          >
            解答を見る
          </button>
        )}
        
        {hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="btn-ghost"
          >
            {showHint ? 'ヒントを隠す' : 'ヒント'}
          </button>
        )}
      </div>

      {/* プログレスインジケーター */}
      {!isCorrect && solution && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>進捗</span>
            <span>{Math.min(attempts * 20, 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(attempts * 20, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      <style>{`
        .code-block {
          user-select: none;
        }
        
        .code-block:active {
          cursor: grabbing;
        }
        
        @media (hover: none) {
          .code-block {
            cursor: default;
          }
        }
      `}</style>
    </div>
  );
};

export default CodeArrangement;