import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsController {

  async getProgressAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { timeRange = '30d', projectId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 時間範囲の計算
      const days = parseInt(timeRange as string) || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // 進捗統計
      const progressStats = await prisma.progress.findMany({
        where: {
          userId,
          ...(projectId && { quest: { projectId: projectId as string } }),
          updatedAt: { gte: startDate }
        },
        include: {
          quest: {
            select: { title: true, difficulty: true, projectId: true }
          }
        }
      });

      // 学習時間の推移
      const learningEvents = await prisma.learningEvent.findMany({
        where: {
          userId,
          timestamp: { gte: startDate },
          eventType: { in: ['QUEST_START', 'STEP_COMPLETE', 'QUEST_COMPLETE'] }
        },
        include: {
          quest: { select: { title: true, difficulty: true } }
        },
        orderBy: { timestamp: 'asc' }
      });

      // 日別学習時間集計
      const dailyStats = new Map<string, {
        questsStarted: number;
        stepsCompleted: number;
        questsCompleted: number;
        timeSpent: number;
      }>();

      learningEvents.forEach(event => {
        const date = event.timestamp.toISOString().split('T')[0];
        const stats = dailyStats.get(date) || {
          questsStarted: 0,
          stepsCompleted: 0,
          questsCompleted: 0,
          timeSpent: 0
        };

        if (event.eventType === 'QUEST_START') stats.questsStarted++;
        if (event.eventType === 'STEP_COMPLETE') stats.stepsCompleted++;
        if (event.eventType === 'QUEST_COMPLETE') stats.questsCompleted++;

        dailyStats.set(date, stats);
      });

      // 難易度別統計
      const difficultyStats = {
        EASY: { completed: 0, inProgress: 0, averageTime: 0 },
        MEDIUM: { completed: 0, inProgress: 0, averageTime: 0 },
        HARD: { completed: 0, inProgress: 0, averageTime: 0 }
      };

      progressStats.forEach(progress => {
        const difficulty = progress.quest.difficulty;
        if (progress.status === 'COMPLETED') {
          difficultyStats[difficulty].completed++;
          difficultyStats[difficulty].averageTime += progress.timeSpent;
        } else if (progress.status === 'IN_PROGRESS') {
          difficultyStats[difficulty].inProgress++;
        }
      });

      // 平均時間の計算
      Object.keys(difficultyStats).forEach(key => {
        const stats = difficultyStats[key as keyof typeof difficultyStats];
        if (stats.completed > 0) {
          stats.averageTime = Math.round(stats.averageTime / stats.completed);
        }
      });

      return res.json({
        success: true,
        data: {
          summary: {
            totalQuests: progressStats.length,
            completedQuests: progressStats.filter(p => p.status === 'COMPLETED').length,
            inProgressQuests: progressStats.filter(p => p.status === 'IN_PROGRESS').length,
            totalTimeSpent: progressStats.reduce((sum, p) => sum + p.timeSpent, 0),
            averageTimePerQuest: progressStats.length > 0 
              ? Math.round(progressStats.reduce((sum, p) => sum + p.timeSpent, 0) / progressStats.length)
              : 0
          },
          dailyStats: Array.from(dailyStats.entries()).map(([date, stats]) => ({
            date,
            ...stats
          })),
          difficultyStats,
          recentActivity: learningEvents.slice(-10)
        }
      });

    } catch (error) {
      console.error('Progress analytics error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCodeHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { projectId, questId, limit = 50 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const codeHistory = await prisma.codeHistory.findMany({
        where: {
          userId,
          ...(projectId && { projectId: projectId as string }),
          ...(questId && { questId: questId as string })
        },
        include: {
          project: { select: { name: true } },
          quest: { select: { title: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string)
      });

      // ファイル別変更統計
      const fileStats = new Map<string, {
        changes: number;
        lastModified: Date;
        changeTypes: Record<string, number>;
      }>();

      codeHistory.forEach(history => {
        const stats = fileStats.get(history.filePath) || {
          changes: 0,
          lastModified: history.timestamp,
          changeTypes: { CREATE: 0, MODIFY: 0, DELETE: 0, RENAME: 0 }
        };

        stats.changes++;
        stats.changeTypes[history.changeType]++;
        if (history.timestamp > stats.lastModified) {
          stats.lastModified = history.timestamp;
        }

        fileStats.set(history.filePath, stats);
      });

      // 時間別活動パターン
      const hourlyActivity = new Array(24).fill(0);
      codeHistory.forEach(history => {
        const hour = history.timestamp.getHours();
        hourlyActivity[hour]++;
      });

      return res.json({
        success: true,
        data: {
          codeHistory,
          fileStats: Array.from(fileStats.entries()).map(([filePath, stats]) => ({
            filePath,
            ...stats
          })),
          hourlyActivity,
          summary: {
            totalChanges: codeHistory.length,
            filesModified: fileStats.size,
            mostActiveHour: hourlyActivity.indexOf(Math.max(...hourlyActivity))
          }
        }
      });

    } catch (error) {
      console.error('Code history error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getLearningPattern(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { days = 30 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const startDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

      // 学習イベント取得
      const events = await prisma.learningEvent.findMany({
        where: {
          userId,
          timestamp: { gte: startDate }
        },
        include: {
          quest: { select: { title: true, difficulty: true } }
        },
        orderBy: { timestamp: 'asc' }
      });

      // パターン分析
      const patterns = {
        peakLearningTimes: new Array(24).fill(0),
        weeklyPattern: new Array(7).fill(0),
        errorPatterns: [] as any[],
        hintUsagePattern: [] as any[],
        completionTrends: [] as any[]
      };

      events.forEach(event => {
        const hour = event.timestamp.getHours();
        const dayOfWeek = event.timestamp.getDay();
        
        patterns.peakLearningTimes[hour]++;
        patterns.weeklyPattern[dayOfWeek]++;

        if (event.eventType === 'ERROR_ENCOUNTER') {
          patterns.errorPatterns.push({
            timestamp: event.timestamp,
            questTitle: event.quest.title,
            data: event.data
          });
        }

        if (event.eventType === 'HINT_REQUEST') {
          patterns.hintUsagePattern.push({
            timestamp: event.timestamp,
            questTitle: event.quest.title,
            data: event.data
          });
        }

        if (event.eventType === 'QUEST_COMPLETE') {
          patterns.completionTrends.push({
            timestamp: event.timestamp,
            questTitle: event.quest.title,
            difficulty: event.quest.difficulty
          });
        }
      });

      // 学習効率分析
      const efficiencyMetrics = {
        averageTimeToComplete: 0,
        errorToCompletionRatio: 0,
        hintDependency: 0,
        consistencyScore: 0
      };

      const completedQuests = await prisma.progress.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate }
        }
      });

      if (completedQuests.length > 0) {
        efficiencyMetrics.averageTimeToComplete = 
          completedQuests.reduce((sum, p) => sum + p.timeSpent, 0) / completedQuests.length;

        const totalErrors = patterns.errorPatterns.length;
        efficiencyMetrics.errorToCompletionRatio = 
          completedQuests.length > 0 ? totalErrors / completedQuests.length : 0;

        const totalHints = patterns.hintUsagePattern.length;
        efficiencyMetrics.hintDependency = 
          completedQuests.length > 0 ? totalHints / completedQuests.length : 0;

        // 一貫性スコア（日々の活動の分散）
        const dailyActivity = patterns.weeklyPattern;
        const avgActivity = dailyActivity.reduce((a, b) => a + b, 0) / dailyActivity.length;
        const variance = dailyActivity.reduce((sum, activity) => 
          sum + Math.pow(activity - avgActivity, 2), 0) / dailyActivity.length;
        efficiencyMetrics.consistencyScore = Math.max(0, 100 - variance);
      }

      return res.json({
        success: true,
        data: {
          patterns,
          efficiencyMetrics,
          insights: {
            mostProductiveHour: patterns.peakLearningTimes.indexOf(Math.max(...patterns.peakLearningTimes)),
            mostProductiveDay: patterns.weeklyPattern.indexOf(Math.max(...patterns.weeklyPattern)),
            totalEvents: events.length,
            analysisRange: days + ' days'
          }
        }
      });

    } catch (error) {
      console.error('Learning pattern error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getClassroomAnalytics(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const { classroomId } = req.params;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 教師がこのクラスの担当者か確認
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, teacherId },
        include: {
          students: {
            include: {
              student: { select: { id: true, name: true, email: true } }
            }
          }
        }
      });

      if (!classroom) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const studentIds = classroom.students.map(s => s.student.id);

      // クラス全体の進捗統計
      const classProgress = await prisma.progress.findMany({
        where: { userId: { in: studentIds } },
        include: {
          user: { select: { name: true, email: true } },
          quest: { select: { title: true, difficulty: true } }
        }
      });

      // 学習時間統計
      const totalTimeSpent = classProgress.reduce((sum, p) => sum + p.timeSpent, 0);
      const averageTimePerStudent = studentIds.length > 0 ? totalTimeSpent / studentIds.length : 0;

      // 難易度別完了率
      const difficultyCompletion = {
        EASY: { total: 0, completed: 0 },
        MEDIUM: { total: 0, completed: 0 },
        HARD: { total: 0, completed: 0 }
      };

      classProgress.forEach(progress => {
        const difficulty = progress.quest.difficulty;
        difficultyCompletion[difficulty].total++;
        if (progress.status === 'COMPLETED') {
          difficultyCompletion[difficulty].completed++;
        }
      });

      // つまずきポイント分析
      const strugglingStudents = classProgress.filter(p => 
        p.status === 'IN_PROGRESS' && 
        p.updatedAt < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      );

      return res.json({
        success: true,
        data: {
          classroom,
          summary: {
            totalStudents: studentIds.length,
            totalQuests: classProgress.length,
            completedQuests: classProgress.filter(p => p.status === 'COMPLETED').length,
            averageTimePerStudent,
            completionRate: classProgress.length > 0 
              ? (classProgress.filter(p => p.status === 'COMPLETED').length / classProgress.length) * 100
              : 0
          },
          difficultyCompletion,
          strugglingStudents: strugglingStudents.map(p => ({
            studentName: p.user.name,
            questTitle: p.quest.title,
            daysSinceLastUpdate: Math.floor(
              (Date.now() - p.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
            )
          })),
          topPerformers: classProgress
            .filter(p => p.status === 'COMPLETED')
            .sort((a, b) => a.timeSpent - b.timeSpent)
            .slice(0, 5)
            .map(p => ({
              studentName: p.user.name,
              questTitle: p.quest.title,
              timeSpent: p.timeSpent,
              completedSteps: p.completedSteps
            }))
        }
      });

    } catch (error) {
      console.error('Classroom analytics error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}