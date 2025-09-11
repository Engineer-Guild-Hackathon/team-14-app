import OpenAI from 'openai';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface QuestGenerationInput {
  articleUrl: string;
  implementationGoal: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  projectContext: {
    name: string;
    description: string;
  };
}

export interface QuestStep {
  title: string;
  description: string;
  type: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT';
  expectedCode?: string;
  hints: string[];
}

export interface GeneratedQuest {
  title: string;
  description: string;
  steps: QuestStep[];
}

export async function generateQuest(input: QuestGenerationInput): Promise<GeneratedQuest> {
  try {
    const prompt = `
あなたは優秀なプログラミング教育AIです。以下の情報を元に、段階的な学習クエストを生成してください。

【記事URL】: ${input.articleUrl}
【実装目標】: ${input.implementationGoal}
【難易度】: ${input.difficulty}
【プロジェクト名】: ${input.projectContext.name}
【プロジェクト概要】: ${input.projectContext.description}

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
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたは優秀なプログラミング教育AIです。初心者にも分かりやすく、段階的な学習クエストを生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = response.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('OpenAI response is empty');
    }

    try {
      const questData = JSON.parse(generatedContent) as GeneratedQuest;
      
      if (!questData.title || !questData.description || !questData.steps || questData.steps.length === 0) {
        throw new Error('Invalid quest structure');
      }

      logger.info(`Quest generated successfully: ${questData.title}`);
      return questData;
    } catch (parseError) {
      logger.error('Failed to parse OpenAI response:', parseError);
      
      return {
        title: `${input.implementationGoal}を実装しよう`,
        description: `${input.articleUrl}の記事を参考に、${input.implementationGoal}を実装するクエストです。段階的に実装を進めて、実践的なスキルを身につけましょう。`,
        steps: [
          {
            title: 'コードの理解',
            description: '記事のサンプルコードを理解し、正しい順序に並べ替えてください。',
            type: 'ARRANGE_CODE',
            hints: [
              '変数の定義から始めましょう',
              '関数の呼び出し順序を考えてください',
              '記事の流れに沿って考えてみてください'
            ]
          },
          {
            title: '基本機能の実装',
            description: `${input.implementationGoal}の基本機能を実装してください。`,
            type: 'IMPLEMENT_CODE',
            expectedCode: '// 実装してください',
            hints: [
              '記事のサンプルコードを参考にしてください',
              'エラーメッセージを確認してください',
              '一つずつ段階的に実装してください'
            ]
          },
          {
            title: '動作確認',
            description: '実装した機能が正しく動作することを確認してください。',
            type: 'VERIFY_OUTPUT',
            hints: [
              'コンソールに結果が表示されるか確認してください',
              'エラーが発生していないか確認してください',
              '期待した結果になっているか確認してください'
            ]
          }
        ]
      };
    }
  } catch (error) {
    logger.error('OpenAI quest generation failed:', error);
    
    return {
      title: `${input.implementationGoal}を実装しよう`,
      description: `記事を参考に、${input.implementationGoal}を実装するクエストです。`,
      steps: [
        {
          title: 'コードの理解',
          description: '記事のコードを理解しましょう',
          type: 'ARRANGE_CODE',
          hints: ['記事を読んで理解してください']
        },
        {
          title: '実装',
          description: '機能を実装してください',
          type: 'IMPLEMENT_CODE',
          expectedCode: '// 実装してください',
          hints: ['記事を参考に実装してください']
        },
        {
          title: '確認',
          description: '動作を確認してください',
          type: 'VERIFY_OUTPUT',
          hints: ['正しく動作するか確認してください']
        }
      ]
    };
  }
}

export async function generateCodeFeedback(code: string, expectedCode: string, context: string): Promise<string> {
  try {
    const prompt = `
以下のコードをレビューして、期待されるコードとの違いや改善点をフィードバックしてください。

【コンテキスト】: ${context}

【期待されるコード】:
${expectedCode}

【提出されたコード】:
${code}

フィードバックは以下の観点で行ってください：
1. 機能的な正確性
2. コードの品質
3. 学習者が理解しやすい改善提案

簡潔で建設的なフィードバックをお願いします。
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは親切なプログラミングメンターです。学習者に分かりやすく建設的なフィードバックを提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'フィードバックの生成に失敗しました。';
  } catch (error) {
    logger.error('Code feedback generation failed:', error);
    return 'コードをよく見直してください。期待されるコードと比較して、違いを見つけてみましょう。';
  }
}