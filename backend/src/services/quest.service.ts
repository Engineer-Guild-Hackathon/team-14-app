import 'dotenv/config';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { QuestStepType, Difficulty } from '@prisma/client';

let openai: OpenAI;

const getOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
};

interface QuestGenerationInput {
  articleUrl: string;
  implementationGoal: string;
  difficulty: Difficulty;
  projectContext: {
    name: string;
    description: string;
  };
}

interface GeneratedQuestStep {
  title: string;
  description: string;
  type: QuestStepType;
  expectedCode?: string;
  hints: string[];
}

interface GeneratedQuest {
  title: string;
  description: string;
  steps: GeneratedQuestStep[];
  estimatedTime: number;
  techStack: string[];
}

export async function generateQuest(input: QuestGenerationInput): Promise<GeneratedQuest> {
  try {
    logger.info(`Generating quest for article: ${input.articleUrl}`);

    // Fetch article content (simplified - in production, use a proper web scraper)
    let articleContent = '';
    try {
      const response = await fetch(input.articleUrl);
      const html = await response.text();
      
      // Basic HTML text extraction (in production, use a proper HTML parser)
      articleContent = html
        .replace(/<script[^>]*>.*?<\/script>/gsi, '')
        .replace(/<style[^>]*>.*?<\/style>/gsi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000); // Limit to prevent token overflow
    } catch (error) {
      logger.warn('Failed to fetch article content, using URL only');
      articleContent = `記事URL: ${input.articleUrl}`;
    }

    const prompt = createQuestGenerationPrompt(input, articleContent);
    
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたは熟練したプログラミング教育者です。技術記事を基に、学習者が実際にコードを書いて学べる段階的なクエストを生成します。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('OpenAI API returned empty response');
    }

    // Parse the JSON response
    let questData;
    try {
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      const jsonText = responseText.substring(jsonStart, jsonEnd);
      questData = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error('Failed to parse OpenAI response:', { response: responseText, error: parseError });
      throw new Error('クエストデータの解析に失敗しました');
    }

    // Validate and format the response
    const quest = validateAndFormatQuest(questData, input);
    
    logger.info(`Quest generated successfully: ${quest.title}`);
    return quest;

  } catch (error) {
    logger.error('Quest generation error:', error);
    throw new Error('AIクエストの生成中にエラーが発生しました');
  }
}

function createQuestGenerationPrompt(input: QuestGenerationInput, articleContent: string): string {
  const difficultyMap = {
    EASY: '初級者向け（基本的な概念の学習）',
    MEDIUM: '中級者向け（実践的な実装）',
    HARD: '上級者向け（複雑な実装と最適化）'
  };

  return `
# クエスト生成依頼

## プロジェクト情報
- プロジェクト名: ${input.projectContext.name}
- プロジェクト説明: ${input.projectContext.description}
- 実装目標: ${input.implementationGoal}
- 難易度: ${difficultyMap[input.difficulty]}

## 技術記事の内容
${articleContent}

## 生成要求
上記の技術記事を参考に、プロジェクトの実装目標を達成するための段階的なクエストを生成してください。

### 生成条件
1. **ステップ数**: 3-6ステップ
2. **各ステップ**:
   - タイトル: 実装する機能の名前
   - 説明: 何を実装するかの詳細
   - タイプ: ARRANGE_CODE（コード並べ替え）、IMPLEMENT_CODE（コード実装）、VERIFY_OUTPUT（出力確認）のいずれか
   - expectedCode: 期待されるコード例（IMPLEMENT_CODEの場合）
   - hints: つまずいた時のヒント（2-3個）

3. **技術スタック**: 使用する主要な技術・ライブラリのリスト
4. **推定時間**: 完了までの予想時間（分）

### レスポンス形式（JSON）
必ず以下のJSON形式で回答してください：

\`\`\`json
{
  "title": "クエストのタイトル",
  "description": "クエストの概要説明",
  "estimatedTime": 120,
  "techStack": ["React", "JavaScript", "CSS"],
  "steps": [
    {
      "title": "ステップ1のタイトル",
      "description": "ステップ1の詳細説明",
      "type": "IMPLEMENT_CODE",
      "expectedCode": "期待されるコード例（任意）",
      "hints": [
        "ヒント1",
        "ヒント2",
        "ヒント3"
      ]
    }
  ]
}
\`\`\`

実装目標「${input.implementationGoal}」を達成するための段階的なクエストを生成してください。
  `;
}

function validateAndFormatQuest(questData: any, input: QuestGenerationInput): GeneratedQuest {
  // Validate required fields
  if (!questData.title || !questData.description || !questData.steps) {
    throw new Error('必須フィールドが不足しています');
  }

  if (!Array.isArray(questData.steps) || questData.steps.length === 0) {
    throw new Error('ステップが無効です');
  }

  // Validate and format steps
  const formattedSteps: GeneratedQuestStep[] = questData.steps.map((step: any, index: number) => {
    if (!step.title || !step.description || !step.type) {
      throw new Error(`ステップ ${index + 1} の必須フィールドが不足しています`);
    }

    // Validate step type
    const validTypes: QuestStepType[] = ['ARRANGE_CODE', 'IMPLEMENT_CODE', 'VERIFY_OUTPUT'];
    if (!validTypes.includes(step.type)) {
      step.type = 'IMPLEMENT_CODE'; // Default fallback
    }

    return {
      title: step.title,
      description: step.description,
      type: step.type,
      expectedCode: step.expectedCode || null,
      hints: Array.isArray(step.hints) ? step.hints.slice(0, 5) : [] // Limit to 5 hints max
    };
  });

  return {
    title: questData.title,
    description: questData.description,
    steps: formattedSteps,
    estimatedTime: Math.max(30, Math.min(480, questData.estimatedTime || 120)), // Between 30min - 8hours
    techStack: Array.isArray(questData.techStack) ? questData.techStack.slice(0, 10) : []
  };
}

/**
 * Generate a code arrangement puzzle for a given step
 */
export async function generateCodeArrangementPuzzle(
  stepDescription: string,
  expectedCode: string,
  difficulty: Difficulty
): Promise<{ blocks: { id: string; content: string; order: number }[], solution: string[] }> {
  try {
    const prompt = `
# コード並べ替えパズル生成

## 実装内容
${stepDescription}

## 正解コード
\`\`\`
${expectedCode}
\`\`\`

## 生成要求
上記のコードを5-8個のブロックに分割し、並べ替えパズルを作成してください。
学習者がドラッグ&ドロップで正しい順序に並べることで、完成したコードを学習できるようにします。

### 分割ルール
1. 意味のある単位で分割（関数単位、ロジック単位など）
2. 1ブロックあたり1-5行程度
3. 初心者が理解しやすい粒度

### レスポンス形式（JSON）
\`\`\`json
{
  "blocks": [
    {
      "id": "block-1",
      "content": "コードブロックの内容",
      "order": 1
    }
  ],
  "solution": ["block-3", "block-1", "block-2"]
}
\`\`\`

正しい順序で並べるとexpectedCodeになるようなパズルを生成してください。
`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('OpenAI API returned empty response');
    }

    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    const jsonText = responseText.substring(jsonStart, jsonEnd);
    const puzzleData = JSON.parse(jsonText);

    return {
      blocks: puzzleData.blocks || [],
      solution: puzzleData.solution || []
    };

  } catch (error) {
    logger.error('Code arrangement puzzle generation error:', error);
    
    // Fallback: simple line-by-line split
    const lines = expectedCode.split('\n').filter(line => line.trim());
    const blocks = lines.map((line, index) => ({
      id: `block-${index + 1}`,
      content: line,
      order: index + 1
    }));
    
    const solution = blocks.map(block => block.id);

    return { blocks, solution };
  }
}