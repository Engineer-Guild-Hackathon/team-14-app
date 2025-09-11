import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const registerSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
  role: z.enum(['STUDENT', 'TEACHER', 'MENTOR']).optional().default('STUDENT')
});

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードは必須です')
});

const generateTokens = (userId: string, email: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  
  const accessToken = jwt.sign(
    { userId, email, role },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    jwtRefreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'このメールアドレスは既に登録されています'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true
      }
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    logger.error('Registration error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'ユーザー登録中にエラーが発生しました'
      }
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません'
        }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.email}`);

    return res.json({
      message: 'ログインしました',
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    logger.error('Login error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'ログイン中にエラーが発生しました'
      }
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'リフレッシュトークンが必要です'
        }
      });
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    const decoded = jwt.verify(token, jwtRefreshSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つからないか、無効化されています'
        }
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role
    );

    return res.json({
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(403).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'リフレッシュトークンが無効です'
      }
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  logger.info(`User logged out: ${req.user?.email}`);
  res.json({
    message: 'ログアウトしました'
  });
};