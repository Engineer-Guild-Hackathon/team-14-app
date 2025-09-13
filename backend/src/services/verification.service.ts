import { logger } from '../utils/logger';
import { sanitizeCode, isCodeFile, getFileExtension } from '../utils/helpers';

interface VerificationInput {
  stepId: string;
  filePath: string;
  submittedCode: string;
  expectedCode?: string;
  stepType: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT';
}

interface VerificationResult {
  success: boolean;
  score: number; // 0-100
  feedback: string;
  hints: string[];
  improvements: string[];
  errors: VerificationError[];
}

interface VerificationError {
  type: 'syntax' | 'logic' | 'style' | 'missing';
  line?: number;
  message: string;
  suggestion?: string;
}

/**
 * Main verification function that routes to appropriate verification strategy
 */
export async function verifyCode(input: VerificationInput): Promise<VerificationResult> {
  try {
    logger.info(`Verifying code for step: ${input.stepId}`);

    // Sanitize input
    const sanitizedCode = sanitizeCode(input.submittedCode);
    
    // Route to appropriate verification strategy
    switch (input.stepType) {
      case 'ARRANGE_CODE':
        return verifyCodeArrangement(sanitizedCode, input.expectedCode);
      case 'IMPLEMENT_CODE':
        return verifyImplementation(sanitizedCode, input.expectedCode, input.filePath);
      case 'VERIFY_OUTPUT':
        return verifyOutput(sanitizedCode, input.filePath);
      default:
        throw new Error('Unknown step type');
    }

  } catch (error) {
    logger.error('Code verification error:', error);
    return {
      success: false,
      score: 0,
      feedback: 'コード検証中にエラーが発生しました',
      hints: ['再度お試しください'],
      improvements: [],
      errors: [{
        type: 'syntax',
        message: 'システムエラーが発生しました'
      }]
    };
  }
}

/**
 * Verify code arrangement puzzles
 */
async function verifyCodeArrangement(
  submittedCode: string, 
  expectedCode?: string
): Promise<VerificationResult> {
  
  if (!expectedCode) {
    return {
      success: true,
      score: 100,
      feedback: '並べ替えが完了しました！',
      hints: [],
      improvements: [],
      errors: []
    };
  }

  // Normalize whitespace and compare
  const normalizedSubmitted = normalizeCode(submittedCode);
  const normalizedExpected = normalizeCode(expectedCode);
  
  const similarity = calculateSimilarity(normalizedSubmitted, normalizedExpected);
  const isCorrect = similarity >= 0.9;

  return {
    success: isCorrect,
    score: Math.round(similarity * 100),
    feedback: isCorrect 
      ? '🎉 正解です！コードが正しく並べ替えられました。'
      : '❌ 並べ替えが正しくありません。順序を確認してください。',
    hints: isCorrect ? [] : [
      '各行の関係性を考えてみましょう',
      '変数の定義は使用する前に来る必要があります',
      '関数の呼び出し順序に注意してください'
    ],
    improvements: [],
    errors: isCorrect ? [] : [{
      type: 'logic',
      message: 'コードの順序が正しくありません'
    }]
  };
}

/**
 * Verify code implementation
 */
async function verifyImplementation(
  submittedCode: string,
  expectedCode: string | undefined,
  filePath: string
): Promise<VerificationResult> {
  
  const errors: VerificationError[] = [];
  const improvements: string[] = [];
  let score = 100;

  // Basic syntax checking based on file extension
  const extension = getFileExtension(filePath);
  const syntaxErrors = checkBasicSyntax(submittedCode, extension);
  errors.push(...syntaxErrors);

  // Style and best practices checking
  const styleIssues = checkCodeStyle(submittedCode, extension);
  improvements.push(...styleIssues);

  // Compare with expected code if provided
  let similarity = 1.0;
  if (expectedCode) {
    similarity = calculateSimilarity(
      normalizeCode(submittedCode), 
      normalizeCode(expectedCode)
    );
  }

  // Calculate final score
  score = Math.max(0, 100 - (syntaxErrors.length * 20) - (styleIssues.length * 5));
  score = Math.round(score * similarity);

  const isSuccess = score >= 70;

  return {
    success: isSuccess,
    score,
    feedback: isSuccess
      ? '✅ 実装が完了しました！'
      : '⚠️ 実装にいくつか問題があります。修正してみましょう。',
    hints: isSuccess ? [] : generateHints(errors, improvements),
    improvements,
    errors
  };
}

/**
 * Verify output-based steps
 */
async function verifyOutput(submittedCode: string, filePath: string): Promise<VerificationResult> {
  // For output verification, we mainly check if the code is syntactically correct
  // and follows basic patterns
  
  const extension = getFileExtension(filePath);
  const errors = checkBasicSyntax(submittedCode, extension);
  const improvements = checkCodeStyle(submittedCode, extension);
  
  const score = Math.max(0, 100 - (errors.length * 15) - (improvements.length * 3));
  const isSuccess = score >= 60;

  return {
    success: isSuccess,
    score,
    feedback: isSuccess
      ? '✅ コードが正しく動作しそうです！'
      : '⚠️ コードにいくつか問題があります。',
    hints: isSuccess ? [] : [
      'コンソールで実行してエラーを確認してみましょう',
      '変数名や関数名のスペルを確認してください',
      '括弧の対応関係を確認してください'
    ],
    improvements,
    errors
  };
}

/**
 * Basic syntax checking for common languages
 */
function checkBasicSyntax(code: string, extension: string): VerificationError[] {
  const errors: VerificationError[] = [];
  const lines = code.split('\n');

  // Common checks across languages
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      return;
    }

    // Count brackets for balance checking
    for (const char of line) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '(') openParens++;
      else if (char === ')') openParens--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }

    // Language-specific checks
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        checkJavaScriptSyntax(line, lineNum, errors);
        break;
      case 'py':
        checkPythonSyntax(line, lineNum, errors);
        break;
      case 'java':
        checkJavaSyntax(line, lineNum, errors);
        break;
      case 'html':
        checkHTMLSyntax(line, lineNum, errors);
        break;
      case 'css':
        checkCSSSyntax(line, lineNum, errors);
        break;
    }
  });

  // Check bracket balance
  if (openBraces !== 0) {
    errors.push({
      type: 'syntax',
      message: '波括弧 {} の対応関係が正しくありません',
      suggestion: '開き括弧と閉じ括弧の数を確認してください'
    });
  }

  if (openParens !== 0) {
    errors.push({
      type: 'syntax',
      message: '丸括弧 () の対応関係が正しくありません',
      suggestion: '開き括弧と閉じ括弧の数を確認してください'
    });
  }

  if (openBrackets !== 0) {
    errors.push({
      type: 'syntax',
      message: '角括弧 [] の対応関係が正しくありません',
      suggestion: '開き括弧と閉じ括弧の数を確認してください'
    });
  }

  return errors;
}

/**
 * JavaScript/TypeScript specific syntax checks
 */
function checkJavaScriptSyntax(line: string, lineNum: number, errors: VerificationError[]) {
  const trimmed = line.trim();
  
  // Check for common syntax errors
  if (trimmed.includes('function') && !trimmed.includes('(')) {
    errors.push({
      type: 'syntax',
      line: lineNum,
      message: '関数定義に括弧がありません',
      suggestion: 'function name() の形式で定義してください'
    });
  }

  // Check for missing semicolons in simple statements
  if (trimmed.length > 0 && 
      !trimmed.endsWith(';') && 
      !trimmed.endsWith('{') && 
      !trimmed.endsWith('}') &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('//')) {
    
    if (trimmed.includes('=') || trimmed.includes('console.') || trimmed.includes('return')) {
      errors.push({
        type: 'style',
        line: lineNum,
        message: 'セミコロンが不足している可能性があります',
        suggestion: '文の終わりにセミコロン ; を追加してください'
      });
    }
  }
}

/**
 * Python specific syntax checks
 */
function checkPythonSyntax(line: string, lineNum: number, errors: VerificationError[]) {
  const trimmed = line.trim();
  
  // Check for proper indentation (basic check)
  if (line.length > 0 && line[0] === ' ' && (line.match(/^ +/) || [''])[0].length % 4 !== 0) {
    errors.push({
      type: 'style',
      line: lineNum,
      message: 'インデントは4文字のスペースを推奨します',
      suggestion: '4の倍数のスペースでインデントしてください'
    });
  }

  // Check for colon in control structures
  if ((trimmed.startsWith('if ') || trimmed.startsWith('for ') || 
       trimmed.startsWith('while ') || trimmed.startsWith('def ')) && 
      !trimmed.endsWith(':')) {
    errors.push({
      type: 'syntax',
      line: lineNum,
      message: '制御構造の後にコロンがありません',
      suggestion: '文の終わりにコロン : を追加してください'
    });
  }
}

/**
 * Java specific syntax checks
 */
function checkJavaSyntax(line: string, lineNum: number, errors: VerificationError[]) {
  // Basic Java syntax checking would go here
  // This is a simplified version
}

/**
 * HTML specific syntax checks
 */
function checkHTMLSyntax(line: string, lineNum: number, errors: VerificationError[]) {
  // Check for properly closed tags (basic)
  const openTags = line.match(/<[^\/][^>]*>/g) || [];
  const closeTags = line.match(/<\/[^>]*>/g) || [];
  
  // This is a very basic check - in production, you'd use a proper HTML parser
}

/**
 * CSS specific syntax checks
 */
function checkCSSSyntax(line: string, lineNum: number, errors: VerificationError[]) {
  const trimmed = line.trim();
  
  // Check for missing semicolons in property declarations
  if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{')) {
    errors.push({
      type: 'syntax',
      line: lineNum,
      message: 'CSSプロパティにセミコロンがありません',
      suggestion: 'プロパティの終わりにセミコロン ; を追加してください'
    });
  }
}

/**
 * Check code style and best practices
 */
function checkCodeStyle(code: string, extension: string): string[] {
  const improvements: string[] = [];
  const lines = code.split('\n');

  // Check line length
  lines.forEach(line => {
    if (line.length > 120) {
      improvements.push('長すぎる行があります。120文字以内に収めることを推奨します');
    }
  });

  // Check for consistent naming conventions
  if (extension.match(/^(js|jsx|ts|tsx)$/)) {
    // JavaScript/TypeScript style checks
    if (code.includes('var ')) {
      improvements.push('var の代わりに let または const を使用することを推奨します');
    }

    // Check for camelCase variables
    const varDeclarations = code.match(/(?:let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (varDeclarations) {
      varDeclarations.forEach(decl => {
        const varName = decl.split(/\s+/)[1];
        if (varName && varName.includes('_') && !varName.startsWith('_')) {
          improvements.push(`変数名 "${varName}" はcamelCaseスタイル（例: myVariable）を推奨します`);
        }
      });
    }
  }

  return improvements;
}

/**
 * Normalize code for comparison (remove whitespace, comments, etc.)
 */
function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*$/gm, '') // Remove // comments
    .replace(/#.*$/gm, '') // Remove # comments (Python)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity between two code strings
 */
function calculateSimilarity(code1: string, code2: string): number {
  if (code1 === code2) return 1.0;
  
  const longer = code1.length > code2.length ? code1 : code2;
  const shorter = code1.length > code2.length ? code2 : code1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate helpful hints based on errors and improvements
 */
function generateHints(errors: VerificationError[], improvements: string[]): string[] {
  const hints: string[] = [];
  
  if (errors.some(e => e.type === 'syntax')) {
    hints.push('構文エラーがあります。括弧やセミコロンを確認してください');
  }
  
  if (errors.some(e => e.type === 'logic')) {
    hints.push('ロジックに問題があります。処理の流れを見直してください');
  }
  
  if (improvements.length > 0) {
    hints.push('コードの品質を向上させるための提案があります');
  }
  
  // Generic helpful hints
  hints.push('エラーメッセージを注意深く読んでみましょう');
  hints.push('一度に少しずつ変更して動作を確認してください');
  
  return hints.slice(0, 3); // Limit to 3 hints
}