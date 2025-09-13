import React, { useState, useEffect } from 'react';

interface CodeBlock {
  id: string;
  content: string;
  order: number;
}

interface CodeArrangementProps {
  blocks: CodeBlock[];
  onSubmit: (arrangement: string[]) => void;
  hint?: string;
  isCompleted?: boolean;
}

export const CodeArrangement: React.FC<CodeArrangementProps> = ({
  blocks,
  onSubmit,
  hint,
  isCompleted = false
}) => {
  const [arrangedBlocks, setArrangedBlocks] = useState<CodeBlock[]>([]);
  const [draggedItem, setDraggedItem] = useState<CodeBlock | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Shuffle blocks initially
    const shuffled = [...blocks].sort(() => Math.random() - 0.5);
    setArrangedBlocks(shuffled);
  }, [blocks]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, block: CodeBlock, index: number) => {
    setDraggedItem(block);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || draggedFromIndex === null) return;

    const newBlocks = [...arrangedBlocks];
    
    // Remove the dragged item from its original position
    newBlocks.splice(draggedFromIndex, 1);
    
    // Insert the dragged item at the new position
    newBlocks.splice(dropIndex, 0, draggedItem);
    
    setArrangedBlocks(newBlocks);
    setDraggedItem(null);
    setDraggedFromIndex(null);
  };

  const isCorrectOrder = () => {
    return arrangedBlocks.every((block, index) => block.order === index + 1);
  };

  const handleSubmit = () => {
    if (!isCorrectOrder()) {
      alert('順序が正しくありません。もう一度並び替えてください。');
      return;
    }
    const arrangement = arrangedBlocks.map(block => block.content);
    onSubmit(arrangement);
  };

  const getBlockStyle = (block: CodeBlock, index: number) => {
    const baseStyle = "bg-white border-2 border-gray-300 rounded-lg p-4 mb-2 cursor-move transition-all duration-200 hover:border-blue-400 hover:shadow-md";
    
    if (draggedItem?.id === block.id) {
      return baseStyle + " opacity-50";
    }
    
    if (isCompleted) {
      const isCorrectPosition = block.order === index + 1;
      return baseStyle + (isCorrectPosition 
        ? " border-green-500 bg-green-50" 
        : " border-red-500 bg-red-50"
      );
    }
    
    return baseStyle;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">🧩 コードブロックを正しい順序に並べ替えてください</h3>
        <p className="text-gray-600">ドラッグ&ドロップでコードブロックを正しい順序に並べ替えて、プログラムの流れを理解しましょう。</p>
      </div>

      {/* Hint Section */}
      {hint && (
        <div className="mb-4">
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            💡 ヒントを見る
            <span className={`transition-transform ${showHint ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showHint && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
              {hint}
            </div>
          )}
        </div>
      )}

      {/* Drag and Drop Area */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
        <h4 className="font-medium text-gray-700 mb-4">📝 正しい順序はこちら:</h4>
        <div className="space-y-2">
          {arrangedBlocks.map((block, index) => (
            <div
              key={block.id}
              draggable={!isCompleted}
              onDragStart={(e) => handleDragStart(e, block, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={getBlockStyle(block, index)}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <pre className="flex-1 text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {block.content}
                </pre>
                {!isCompleted && (
                  <div className="flex-shrink-0 text-gray-400 cursor-move">
                    ⋮⋮
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      {!isCompleted && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={arrangedBlocks.length === 0}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              isCorrectOrder() 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-400 text-white cursor-default'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCorrectOrder() ? '✅ 正解！提出する' : '❌ 順序を確認してください'}
          </button>
        </div>
      )}

      {/* Results */}
      {isCompleted && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-xl">🎉</span>
            <span className="font-medium">Step 1 完了！</span>
          </div>
          <p className="text-green-700 text-sm">
            コードの流れを理解できました！次のステップで実際にコードを書いてみましょう。
          </p>
        </div>
      )}
    </div>
  );
};