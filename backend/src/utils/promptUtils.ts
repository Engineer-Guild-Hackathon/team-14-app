/**
 * プロンプトテンプレート処理ユーティリティ
 * 変数の置換とテンプレートの管理を行います
 */

/**
 * テンプレート文字列内の変数を置換します
 * @param template テンプレート文字列
 * @param variables 置換する変数のオブジェクト
 * @returns 置換後の文字列
 */
export function interpolateTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * フォールバック用のオブジェクトの変数を置換します
 * @param fallbackObj フォールバックオブジェクト
 * @param variables 置換する変数のオブジェクト
 * @returns 置換後のオブジェクト
 */
export function interpolateFallbackResponse(
  fallbackObj: any,
  variables: Record<string, any>
): any {
  if (typeof fallbackObj === 'string') {
    return interpolateTemplate(fallbackObj, variables);
  }
  
  if (Array.isArray(fallbackObj)) {
    return fallbackObj.map(item => interpolateFallbackResponse(item, variables));
  }
  
  if (typeof fallbackObj === 'object' && fallbackObj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(fallbackObj)) {
      result[key] = interpolateFallbackResponse(value, variables);
    }
    return result;
  }
  
  return fallbackObj;
}

/**
 * OpenAI APIのレスポンスを検証します
 * @param response OpenAI APIからのレスポンス文字列
 * @returns パース済みのオブジェクトまたはnull
 */
export function validateAndParseOpenAIResponse(response: string): any | null {
  try {
    // JSONの前後の不要な文字列を除去
    const cleanedResponse = response
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    
    const parsed = JSON.parse(cleanedResponse);
    
    // 基本的な構造検証
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to parse OpenAI response:', error);
    return null;
  }
}

/**
 * プロンプトの設定を検証します
 * @param config プロンプト設定オブジェクト
 * @returns 検証結果
 */
export function validatePromptConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return { isValid: false, errors };
  }
  
  const requiredSections = ['questGeneration', 'codeFeedback', 'hintGeneration', 'codeArrangement'];
  
  for (const section of requiredSections) {
    if (!config[section]) {
      errors.push(`Missing section: ${section}`);
      continue;
    }
    
    const sectionConfig = config[section];
    if (!sectionConfig.system || !sectionConfig.user) {
      errors.push(`Section ${section} must have 'system' and 'user' prompts`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * プロンプト使用統計を記録します
 * @param promptType 使用したプロンプトタイプ
 * @param success 成功したかどうか
 * @param responseTime レスポンス時間（ミリ秒）
 */
export function logPromptUsage(
  promptType: string, 
  success: boolean, 
  responseTime: number
): void {
  // 本格運用時は適切なロギングシステムに記録
  console.log(`Prompt Usage: ${promptType}, Success: ${success}, Response Time: ${responseTime}ms`);
}

/**
 * エラー発生時のフォールバック処理
 * @param errorType エラーの種類
 * @param context エラー発生時のコンテキスト
 * @returns フォールバック用のレスポンス
 */
export function createErrorFallback(errorType: string, context: Record<string, any>): any {
  const baseResponse = {
    title: `${context.implementationGoal || '実装課題'}を学習しよう`,
    description: `技術記事を参考に実装を進めるクエストです。段階的に学習を進めて、実践的なスキルを身につけましょう。`,
    steps: [
      {
        title: "基礎理解",
        description: "まず記事の内容を理解し、基本的な概念を学びましょう。",
        type: "ARRANGE_CODE",
        hints: [
          "記事をしっかりと読んで理解してください",
          "分からない用語は調べてみましょう",
          "サンプルコードがある場合は実行してみてください"
        ]
      },
      {
        title: "実装開始",
        description: "学んだ内容を実際に実装してみましょう。",
        type: "IMPLEMENT_CODE",
        expectedCode: "// ここに実装してください",
        hints: [
          "小さな部分から始めて徐々に機能を追加してください",
          "エラーが出ても慌てず、メッセージを読んで対処しましょう",
          "動作確認を小刻みに行いながら進めてください"
        ]
      },
      {
        title: "動作確認",
        description: "実装した機能が期待通りに動作するか確認しましょう。",
        type: "VERIFY_OUTPUT",
        hints: [
          "実行結果が期待通りかチェックしてください",
          "エラーや警告が出ていないか確認してください",
          "異なる入力値でもテストしてみてください"
        ]
      }
    ]
  };

  return baseResponse;
}