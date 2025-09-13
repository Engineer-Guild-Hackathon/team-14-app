import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { PROMPTS } from '../config/prompts';
import { 
  interpolateTemplate, 
  interpolateFallbackResponse, 
  validateAndParseOpenAIResponse, 
  logPromptUsage 
} from '../utils/promptUtils';

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
  const startTime = Date.now();
  
  try {
    const variables = {
      articleUrl: input.articleUrl,
      implementationGoal: input.implementationGoal,
      difficulty: input.difficulty,
      projectName: input.projectContext.name,
      projectDescription: input.projectContext.description
    };

    const systemPrompt = interpolateTemplate(PROMPTS.questGeneration.system, variables);
    const userPrompt = interpolateTemplate(PROMPTS.questGeneration.user, variables);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = response.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('OpenAI response is empty');
    }

    const questData = validateAndParseOpenAIResponse(generatedContent);
    
    if (!questData || !questData.title || !questData.description || !questData.steps || questData.steps.length === 0) {
      logger.warn('Invalid quest structure from OpenAI, using fallback');
      const fallbackResponse = interpolateFallbackResponse(PROMPTS.questGeneration.fallbackResponse!, variables);
      logPromptUsage('questGeneration', false, Date.now() - startTime);
      return fallbackResponse;
    }

    logger.info(`Quest generated successfully: ${questData.title}`);
    logPromptUsage('questGeneration', true, Date.now() - startTime);
    return questData;

  } catch (error) {
    logger.error('OpenAI quest generation failed:', error);
    
    const variables = {
      articleUrl: input.articleUrl,
      implementationGoal: input.implementationGoal,
      difficulty: input.difficulty,
      projectName: input.projectContext.name,
      projectDescription: input.projectContext.description
    };
    
    const fallbackResponse = interpolateFallbackResponse(PROMPTS.questGeneration.fallbackResponse!, variables);
    logPromptUsage('questGeneration', false, Date.now() - startTime);
    return fallbackResponse;
  }
}

export async function generateCodeFeedback(
  submittedCode: string, 
  expectedCode: string, 
  filePath: string
): Promise<{
  score: number;
  feedback: string;
  improvements: string[];
  hints: string[];
  errors: Array<{
    type: 'syntax' | 'logic' | 'style' | 'missing';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
}> {
  const startTime = Date.now();
  
  try {
    const variables = {
      submittedCode,
      expectedCode,
      filePath
    };

    const systemPrompt = interpolateTemplate(PROMPTS.codeFeedback.system, variables);
    const userPrompt = interpolateTemplate(PROMPTS.codeFeedback.user, variables);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const generatedContent = response.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('OpenAI response is empty');
    }

    const feedbackData = validateAndParseOpenAIResponse(generatedContent);
    
    if (!feedbackData || typeof feedbackData.score !== 'number') {
      logger.warn('Invalid feedback structure from OpenAI, using fallback');
      logPromptUsage('codeFeedback', false, Date.now() - startTime);
      return createFallbackFeedback();
    }

    logPromptUsage('codeFeedback', true, Date.now() - startTime);
    return {
      score: feedbackData.score || 0,
      feedback: feedbackData.feedback || 'コードを確認してください',
      improvements: feedbackData.improvements || [],
      hints: feedbackData.hints || [],
      errors: feedbackData.errors || []
    };

  } catch (error) {
    logger.error('Code feedback generation failed:', error);
    logPromptUsage('codeFeedback', false, Date.now() - startTime);
    return createFallbackFeedback();
  }
}

function createFallbackFeedback() {
  return {
    score: 50,
    feedback: 'コードをよく見直してください。期待されるコードと比較して、違いを見つけてみましょう。',
    improvements: [
      '構文エラーがないか確認してください',
      '変数名や関数名が正しいか確認してください',
      '実装が要求通りになっているか確認してください'
    ],
    hints: [
      '一行ずつ丁寧にコードを確認してみてください',
      'エラーメッセージがある場合は、その内容をよく読んでください',
      '期待されるコードと比較して、足りない部分を見つけてみてください'
    ],
    errors: []
  };
}

/**
 * 学習者向けのヒントを生成する
 */
export async function generateHint(
  currentCode: string,
  errorMessage: string,
  stepGoal: string,
  difficulty: string
): Promise<string[]> {
  const startTime = Date.now();
  
  try {
    const variables = {
      currentCode,
      errorMessage,
      stepGoal,
      difficulty
    };

    const systemPrompt = interpolateTemplate(PROMPTS.hintGeneration.system, variables);
    const userPrompt = interpolateTemplate(PROMPTS.hintGeneration.user, variables);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const generatedContent = response.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('OpenAI response is empty');
    }

    const hintData = validateAndParseOpenAIResponse(generatedContent);
    
    if (!hintData || !Array.isArray(hintData.hints)) {
      logger.warn('Invalid hint structure from OpenAI, using fallback');
      logPromptUsage('hintGeneration', false, Date.now() - startTime);
      return createFallbackHints();
    }

    logPromptUsage('hintGeneration', true, Date.now() - startTime);
    return hintData.hints;

  } catch (error) {
    logger.error('Hint generation failed:', error);
    logPromptUsage('hintGeneration', false, Date.now() - startTime);
    return createFallbackHints();
  }
}

function createFallbackHints(): string[] {
  return [
    'エラーメッセージをよく読んで、何が問題なのかを理解しましょう',
    '小さな変更から始めて、段階的に機能を追加してみてください',
    '似たような実装例を探して、参考にしてみてください'
  ];
}

/**
 * コード並べ替え問題を生成する
 */
export async function generateCodeArrangementPuzzle(
  originalCode: string,
  learningGoal: string
): Promise<{
  title: string;
  description: string;
  shuffledBlocks: Array<{
    id: string;
    code: string;
    correctOrder: number;
  }>;
  hints: string[];
}> {
  const startTime = Date.now();
  
  try {
    const variables = {
      originalCode,
      learningGoal
    };

    const systemPrompt = interpolateTemplate(PROMPTS.codeArrangement.system, variables);
    const userPrompt = interpolateTemplate(PROMPTS.codeArrangement.user, variables);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const generatedContent = response.choices[0].message.content;
    
    if (!generatedContent) {
      throw new Error('OpenAI response is empty');
    }

    const puzzleData = validateAndParseOpenAIResponse(generatedContent);
    
    if (!puzzleData || !puzzleData.shuffledBlocks || !Array.isArray(puzzleData.shuffledBlocks)) {
      logger.warn('Invalid puzzle structure from OpenAI, using fallback');
      logPromptUsage('codeArrangement', false, Date.now() - startTime);
      return createFallbackArrangementPuzzle(originalCode, learningGoal);
    }

    logPromptUsage('codeArrangement', true, Date.now() - startTime);
    return puzzleData;

  } catch (error) {
    logger.error('Code arrangement puzzle generation failed:', error);
    logPromptUsage('codeArrangement', false, Date.now() - startTime);
    return createFallbackArrangementPuzzle(originalCode, learningGoal);
  }
}

function createFallbackArrangementPuzzle(originalCode: string, learningGoal: string) {
  const lines = originalCode.split('\n').filter(line => line.trim());
  const blocks = lines.map((line, index) => ({
    id: `block${index + 1}`,
    code: line,
    correctOrder: index + 1
  }));

  return {
    title: `${learningGoal}のコード並べ替え`,
    description: 'コードブロックを正しい順序に並べ替えて、動作するプログラムを完成させましょう。',
    shuffledBlocks: blocks,
    hints: [
      'プログラムの実行順序を考えてみましょう',
      '変数の宣言と使用の関係を確認してみてください',
      '関数の定義と呼び出しの順序を意識してください'
    ]
  };
}