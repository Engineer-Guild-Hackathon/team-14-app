/**
 * AI プロンプト設定ファイル
 * OpenAI API用のプロンプトテンプレートを管理します
 */

export interface PromptTemplate {
  system: string;
  user: string;
  fallbackResponse?: {
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      type: string;
      expectedCode?: string;
      hints: string[];
    }>;
  };
}

export interface PromptConfig {
  questGeneration: PromptTemplate;
  codeFeedback: PromptTemplate;
  hintGeneration: PromptTemplate;
  codeArrangement: PromptTemplate;
}

export const PROMPTS: PromptConfig = {
  questGeneration: {
    system: `あなたは優秀なプログラミング教育AIです。初心者にも分かりやすく、段階的な学習クエストを生成してください。

以下の原則に従って、質の高いクエストを作成してください：
1. 学習者のレベルに合わせた適切な難易度設定
2. 実践的で意味のある実装目標
3. 明確で理解しやすい手順説明
4. つまずきやすいポイントへの適切なヒント提供
5. 成功体験を得られる段階的なステップ構成`,

    user: `以下の情報を元に、段階的な学習クエストを生成してください。

【記事URL】: {articleUrl}
【実装目標】: {implementationGoal}
【難易度】: {difficulty}
【プロジェクト名】: {projectName}
【プロジェクト概要】: {projectDescription}

以下の条件でクエストを生成してください：

1. **クエスト全体**：
   - タイトル: 魅力的で学習目標が明確
   - 説明: 何を学び、何を実装するかを詳細に説明

2. **ステップ構成**（3-5ステップ）：
   - Step 1: ARRANGE_CODE（コードブロック並べ替えで理解）
   - Step 2-4: IMPLEMENT_CODE（実際の実装）
   - Final Step: VERIFY_OUTPUT（動作確認）

3. **各ステップ**：
   - title: ステップの目標
   - description: 詳細な手順とヒント
   - type: ステップタイプ
   - expectedCode: 期待されるコード（実装ステップのみ）
   - hints: つまづいた時のヒント（2-3個）

JSON形式で回答してください：

{
  "title": "クエストタイトル",
  "description": "クエストの詳細説明",
  "steps": [
    {
      "title": "ステップタイトル",
      "description": "ステップの詳細説明",
      "type": "ARRANGE_CODE",
      "hints": ["ヒント1", "ヒント2"]
    }
  ]
}`,

    fallbackResponse: {
      title: "{implementationGoal}を実装しよう",
      description: "{articleUrl}の記事を参考に、{implementationGoal}を実装するクエストです。段階的に実装を進めて、実践的なスキルを身につけましょう。",
      steps: [
        {
          title: "コードの理解",
          description: "記事のサンプルコードを理解し、正しい順序に並べ替えてください。",
          type: "ARRANGE_CODE",
          hints: [
            "変数の定義から始めましょう",
            "関数の呼び出し順序を考えてください",
            "記事の流れに沿って考えてみてください"
          ]
        },
        {
          title: "基本機能の実装",
          description: "{implementationGoal}の基本機能を実装してください。",
          type: "IMPLEMENT_CODE",
          expectedCode: "// 実装してください",
          hints: [
            "記事のサンプルコードを参考にしてください",
            "エラーメッセージを確認してください",
            "一つずつ段階的に実装してください"
          ]
        },
        {
          title: "動作確認",
          description: "実装した機能が正しく動作することを確認してください。",
          type: "VERIFY_OUTPUT",
          hints: [
            "コンソールに結果が表示されるか確認してください",
            "エラーが発生していないか確認してください",
            "期待した結果になっているか確認してください"
          ]
        }
      ]
    }
  },

  codeFeedback: {
    system: `あなたは経験豊富なプログラミング講師です。学習者のコードを評価し、建設的なフィードバックを提供してください。

評価の観点：
1. コードの正確性と動作確認
2. ベストプラクティスの遵守
3. 可読性と保守性
4. エラーハンドリング
5. 改善提案とより良い書き方の提示`,

    user: `以下のコードを評価してください：

【提出されたコード】:
{submittedCode}

【期待されるコード（参考）】:
{expectedCode}

【ファイルパス】: {filePath}

以下の形式でフィードバックをJSON形式で提供してください：
{
  "score": 0-100,
  "feedback": "全体的な評価コメント",
  "improvements": ["改善提案1", "改善提案2"],
  "hints": ["ヒント1", "ヒント2"],
  "errors": [
    {
      "type": "syntax|logic|style|missing",
      "line": 行番号,
      "message": "エラーの詳細",
      "suggestion": "修正提案"
    }
  ]
}`
  },

  hintGeneration: {
    system: `あなたは親切なプログラミングメンターです。学習者がつまずいている箇所に対して、適切なヒントを提供してください。

ヒント提供の原則：
1. 答えを直接教えるのではなく、考える方向性を示す
2. 段階的に理解を深められるような順序で提示
3. 具体的で実行可能なアドバイス
4. 学習者の現在のレベルに合わせた説明`,

    user: `学習者が以下の状況でつまずいています。適切なヒントを提供してください：

【現在のコード】: {currentCode}
【エラーメッセージ】: {errorMessage}
【ステップの目標】: {stepGoal}
【難易度レベル】: {difficulty}

3つのヒントをJSON形式で提供してください：
{
  "hints": [
    "まず最初に確認すべきポイント",
    "次に試してみるべきアプローチ",
    "最終的な解決に向けたヒント"
  ]
}`
  },

  codeArrangement: {
    system: `あなたはプログラミング学習のパズル作成者です。与えられたコードから、学習効果の高いコード並べ替え問題を作成してください。

パズル作成の原則：
1. プログラムの論理的な流れを理解できる構成
2. 初心者でも段階的に理解できる難易度
3. 実行順序や依存関係が明確になる構成
4. 完成時に動作するコードになること`,

    user: `以下のコードから並べ替え問題を作成してください：

【元のコード】: {originalCode}
【学習目標】: {learningGoal}

以下の形式でJSONを返してください：
{
  "title": "並べ替え問題のタイトル",
  "description": "問題の説明と学習目標",
  "shuffledBlocks": [
    {
      "id": "block1",
      "code": "コードブロック1",
      "correctOrder": 1
    }
  ],
  "hints": [
    "プログラムの実行順序のヒント",
    "変数や関数の依存関係のヒント"
  ]
}`
  }
};