import React, { useState, useEffect } from 'react';

interface CodeEditorProps {
  instruction: string;
  expectedCode?: string;
  filePath?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onSubmit?: (code: string) => void;
  isCompleted?: boolean;
  hint?: string;
  language?: string;
}

interface VerificationResult {
  success: boolean;
  score: number;
  feedback: string;
  hints: string[];
  improvements: string[];
  errors: Array<{
    type: 'syntax' | 'logic' | 'style' | 'missing';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  instruction,
  expectedCode,
  filePath,
  initialCode = '',
  onCodeChange,
  onSubmit,
  isCompleted = false,
  hint,
  language = 'javascript'
}) => {
  const [code, setCode] = useState(initialCode);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExpected, setShowExpected] = useState(false);

  useEffect(() => {
    // Real-time verification with debounce
    const verifyCode = async () => {
      if (!code.trim() || isCompleted) return;
      
      setIsVerifying(true);
      try {
        // Simulate API call to backend for verification
        const response = await window.electronAPI.api.request({
          method: 'POST',
          url: 'http://localhost:3000/api/quests/verify-code',
          data: {
            submittedCode: code,
            expectedCode,
            filePath,
            stepType: 'IMPLEMENT_CODE'
          }
        });

        if (response.success) {
          setVerificationResult(response.data);
        }
      } catch (error) {
        console.error('Verification failed:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    const timeoutId = setTimeout(verifyCode, 1500); // Debounce for 1.5 seconds
    return () => clearTimeout(timeoutId);
  }, [code, expectedCode, filePath, isCompleted]);

  const handleCodeChange = (value: string) => {
    setCode(value);
    onCodeChange?.(value);
  };

  const handleSubmit = () => {
    onSubmit?.(code);
  };

  const getLineNumbers = () => {
    const lines = code.split('\n');
    return lines.map((_, index) => index + 1);
  };

  const getVerificationIcon = () => {
    if (isVerifying) return '⏳';
    if (!verificationResult) return '❓';
    if (verificationResult.success) return '✅';
    return '❌';
  };

  const getVerificationColor = () => {
    if (isVerifying) return 'text-yellow-600';
    if (!verificationResult) return 'text-gray-400';
    if (verificationResult.success) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">💻 コードを実装してください</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 mb-2">📋 指示:</h4>
          <p className="text-blue-800 text-sm whitespace-pre-wrap">{instruction}</p>
        </div>
        {filePath && (
          <p className="text-sm text-gray-600 mb-2">📁 ファイル: <code className="bg-gray-100 px-2 py-1 rounded">{filePath}</code></p>
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

      <div className="flex gap-4">
        {/* Code Editor */}
        <div className="flex-1">
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            {/* Editor Header */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">コードエディター</span>
                <span className={`text-sm ${getVerificationColor()}`}>
                  {getVerificationIcon()} 
                  {isVerifying ? 'チェック中...' : 
                   verificationResult?.success ? 'OK' : 
                   verificationResult ? 'エラーあり' : '未チェック'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {expectedCode && (
                  <button
                    onClick={() => setShowExpected(!showExpected)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showExpected ? '期待値を隠す' : '期待値を表示'}
                  </button>
                )}
              </div>
            </div>

            {/* Editor Body */}
            <div className="relative">
              {/* Line Numbers */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 border-r border-gray-200 p-2">
                <div className="text-xs text-gray-500 font-mono leading-6">
                  {getLineNumbers().map(num => (
                    <div key={num}>{num}</div>
                  ))}
                </div>
              </div>

              {/* Code Textarea */}
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full h-64 pl-16 pr-4 py-2 font-mono text-sm resize-none border-none focus:outline-none focus:ring-0"
                placeholder={`// ${language}コードをここに書いてください...\n// リアルタイムで正しさがチェックされます`}
                disabled={isCompleted}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Expected Code (if shown) */}
          {showExpected && expectedCode && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="px-4 py-2 border-b border-green-200">
                <span className="text-sm font-medium text-green-800">期待されるコード例:</span>
              </div>
              <pre className="p-4 text-sm font-mono text-green-800 whitespace-pre-wrap">
                {expectedCode}
              </pre>
            </div>
          )}
        </div>

        {/* Verification Panel */}
        <div className="w-80">
          <div className="bg-white border border-gray-300 rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">リアルタイム検証</span>
            </div>
            <div className="p-4">
              {!verificationResult ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-sm">コードを書くと自動でチェックします</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Score */}
                  <div className={`text-center p-3 rounded-lg ${
                    verificationResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="text-2xl mb-1">
                      {verificationResult.success ? '🎉' : '🤔'}
                    </div>
                    <div className="font-medium">
                      スコア: {verificationResult.score}/100
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">フィードバック:</h5>
                    <p className="text-sm text-gray-600">{verificationResult.feedback}</p>
                  </div>

                  {/* Errors */}
                  {verificationResult.errors.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-2">エラー:</h5>
                      <div className="space-y-2">
                        {verificationResult.errors.map((error, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                            <div className="text-xs text-red-600 font-medium">
                              {error.type.toUpperCase()}
                              {error.line && ` (line ${error.line})`}
                            </div>
                            <div className="text-sm text-red-800">{error.message}</div>
                            {error.suggestion && (
                              <div className="text-xs text-red-600 mt-1">💡 {error.suggestion}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hints */}
                  {verificationResult.hints.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-700 mb-2">ヒント:</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {verificationResult.hints.map((hint, index) => (
                          <li key={index}>💡 {hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {verificationResult.improvements.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-yellow-700 mb-2">改善提案:</h5>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {verificationResult.improvements.map((improvement, index) => (
                          <li key={index}>⚡ {improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      {!isCompleted && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            disabled={!verificationResult?.success}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verificationResult?.success ? '✅ このコードで完了' : '⏳ コードを完成させてください'}
          </button>
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-xl">🎉</span>
            <span className="font-medium">Step 2 完了！</span>
          </div>
          <p className="text-green-700 text-sm">
            コードが正常に動作しています！次のステップに進みましょう。
          </p>
        </div>
      )}
    </div>
  );
};