import React, { useState, useEffect } from 'react';

interface OutputVerificationProps {
  instruction: string;
  expectedOutput?: string;
  onSubmit?: (actualOutput: string) => void;
  isCompleted?: boolean;
  hint?: string;
  filePath?: string;
}

interface OutputResult {
  success: boolean;
  actualOutput: string;
  expectedOutput: string;
  score: number;
  feedback: string;
  differences: Array<{
    line: number;
    expected: string;
    actual: string;
    message: string;
  }>;
}

export const OutputVerification: React.FC<OutputVerificationProps> = ({
  instruction,
  expectedOutput,
  onSubmit,
  isCompleted = false,
  hint,
  filePath
}) => {
  const [actualOutput, setActualOutput] = useState('');
  const [outputResult, setOutputResult] = useState<OutputResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExpected, setShowExpected] = useState(false);

  const runCode = async () => {
    if (!filePath) {
      alert('実行するファイルが指定されていません');
      return;
    }

    setIsRunning(true);
    try {
      // Request to run the code and get output
      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: 'http://localhost:3000/api/quests/run-code',
        data: {
          filePath,
          stepType: 'VERIFY_OUTPUT'
        }
      });

      if (response.success) {
        const output = response.data.output || '';
        setActualOutput(output);
        
        // Auto-verify if we have expected output
        if (expectedOutput) {
          await verifyOutput(output);
        }
      } else {
        setActualOutput(`エラー: ${response.error}`);
      }
    } catch (error: any) {
      console.error('Code execution failed:', error);
      setActualOutput(`実行エラー: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const verifyOutput = async (output: string) => {
    if (!expectedOutput) return;

    try {
      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: 'http://localhost:3000/api/quests/verify-output',
        data: {
          actualOutput: output,
          expectedOutput,
          stepType: 'VERIFY_OUTPUT'
        }
      });

      if (response.success) {
        setOutputResult(response.data);
      }
    } catch (error) {
      console.error('Output verification failed:', error);
    }
  };

  const handleSubmit = () => {
    if (actualOutput) {
      onSubmit?.(actualOutput);
    }
  };

  const formatOutput = (output: string) => {
    // Handle different output formats
    if (!output) return 'No output';
    return output;
  };

  const getComparisonLines = (expected: string, actual: string) => {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const maxLines = Math.max(expectedLines.length, actualLines.length);
    
    const lines = [];
    for (let i = 0; i < maxLines; i++) {
      const exp = expectedLines[i] || '';
      const act = actualLines[i] || '';
      const isMatch = exp === act;
      
      lines.push({
        lineNumber: i + 1,
        expected: exp,
        actual: act,
        isMatch
      });
    }
    
    return lines;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">🏁 出力を確認してください</h3>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-purple-900 mb-2">📋 指示:</h4>
          <p className="text-purple-800 text-sm whitespace-pre-wrap">{instruction}</p>
        </div>
        {filePath && (
          <p className="text-sm text-gray-600 mb-2">📁 実行ファイル: <code className="bg-gray-100 px-2 py-1 rounded">{filePath}</code></p>
        )}
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

      {/* Run Button */}
      <div className="mb-6">
        <button
          onClick={runCode}
          disabled={isRunning || isCompleted}
          className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isRunning ? '⏳ 実行中...' : '▶️ コードを実行'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Actual Output */}
        <div className="bg-white border border-gray-300 rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">実際の出力</span>
            <div className="flex items-center gap-2">
              {expectedOutput && (
                <button
                  onClick={() => setShowExpected(!showExpected)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showExpected ? '期待値を隠す' : '期待値を表示'}
                </button>
              )}
              {outputResult && (
                <span className={`text-xs px-2 py-1 rounded ${
                  outputResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {outputResult.success ? '✅ 一致' : '❌ 不一致'}
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            {actualOutput ? (
              <pre className="text-sm font-mono bg-gray-50 p-3 rounded border overflow-x-auto">
                {formatOutput(actualOutput)}
              </pre>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">🚀</div>
                <div className="text-sm">「コードを実行」ボタンを押して出力を確認してください</div>
              </div>
            )}
          </div>
        </div>

        {/* Expected Output (if shown) */}
        {showExpected && expectedOutput && (
          <div className="bg-green-50 border border-green-200 rounded-lg">
            <div className="bg-green-100 px-4 py-2 border-b border-green-200">
              <span className="text-sm font-medium text-green-800">期待される出力</span>
            </div>
            <div className="p-4">
              <pre className="text-sm font-mono text-green-800 bg-white p-3 rounded border overflow-x-auto">
                {formatOutput(expectedOutput)}
              </pre>
            </div>
          </div>
        )}

        {/* Comparison Result */}
        {outputResult && (
          <div className={`border rounded-lg ${
            outputResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`px-4 py-2 border-b ${
              outputResult.success ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  outputResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  検証結果
                </span>
                <span className={`text-sm ${
                  outputResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  スコア: {outputResult.score}/100
                </span>
              </div>
            </div>
            <div className="p-4">
              {/* Feedback */}
              <div className="mb-4">
                <p className={`text-sm ${
                  outputResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {outputResult.feedback}
                </p>
              </div>

              {/* Line by Line Comparison */}
              {outputResult.differences && outputResult.differences.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-red-700 mb-3">詳細な差分:</h5>
                  <div className="space-y-2">
                    {outputResult.differences.map((diff, index) => (
                      <div key={index} className="bg-white border border-red-200 rounded p-3">
                        <div className="text-xs text-red-600 font-medium mb-1">
                          Line {diff.line}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-green-600 font-medium">期待値:</span>
                            <pre className="font-mono bg-green-50 p-2 rounded mt-1">
                              {diff.expected || '(空行)'}
                            </pre>
                          </div>
                          <div>
                            <span className="text-xs text-red-600 font-medium">実際:</span>
                            <pre className="font-mono bg-red-50 p-2 rounded mt-1">
                              {diff.actual || '(空行)'}
                            </pre>
                          </div>
                        </div>
                        <div className="text-xs text-red-700 mt-2">
                          💡 {diff.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Comparison */}
              {actualOutput && expectedOutput && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">行ごと比較:</h5>
                  <div className="bg-white border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">行</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">期待値</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">実際</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">結果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getComparisonLines(expectedOutput, actualOutput).map((line, index) => (
                          <tr key={index} className={line.isMatch ? 'bg-green-50' : 'bg-red-50'}>
                            <td className="px-3 py-2 font-mono text-xs">{line.lineNumber}</td>
                            <td className="px-3 py-2 font-mono text-xs max-w-xs truncate">
                              {line.expected || '(empty)'}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs max-w-xs truncate">
                              {line.actual || '(empty)'}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {line.isMatch ? '✅' : '❌'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      {actualOutput && !isCompleted && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            disabled={outputResult && !outputResult.success}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {outputResult?.success ? '✅ この出力で完了' : '⏳ 出力を修正してください'}
          </button>
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-xl">🎉</span>
            <span className="font-medium">Step 3 完了！</span>
          </div>
          <p className="text-green-700 text-sm">
            出力が期待通りです！クエストを完了しました。
          </p>
        </div>
      )}
    </div>
  );
};