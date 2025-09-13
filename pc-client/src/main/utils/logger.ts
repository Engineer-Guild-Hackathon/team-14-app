import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

class Logger {
  private logLevel: keyof LogLevel = 'INFO';
  private logFile: string;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set log file path
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.logFile = path.join(userDataPath, 'logs', 'app.log');
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  setLevel(level: keyof LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels: Record<keyof LogLevel, number> = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(level: keyof LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const processId = process.pid;
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    
    return `[${timestamp}] [${processId}] [${level}] ${message}${dataStr}`;
  }

  private writeToFile(formattedMessage: string): void {
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  error(message: string, data?: any): void {
    if (!this.shouldLog('ERROR')) return;
    
    const formatted = this.formatMessage('ERROR', message, data);
    
    if (this.isDevelopment) {
      console.error(formatted);
    }
    
    this.writeToFile(formatted);
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog('WARN')) return;
    
    const formatted = this.formatMessage('WARN', message, data);
    
    if (this.isDevelopment) {
      console.warn(formatted);
    }
    
    this.writeToFile(formatted);
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog('INFO')) return;
    
    const formatted = this.formatMessage('INFO', message, data);
    
    if (this.isDevelopment) {
      console.info(formatted);
    }
    
    this.writeToFile(formatted);
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog('DEBUG')) return;
    
    const formatted = this.formatMessage('DEBUG', message, data);
    
    if (this.isDevelopment) {
      console.debug(formatted);
    }
    
    this.writeToFile(formatted);
  }

  // Method to get recent logs
  getRecentLogs(lines: number = 100): string[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.logFile, 'utf8');
      const allLines = content.trim().split('\n').filter(line => line.length > 0);
      
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  // Method to clear logs
  clearLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
      }
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }
}

export const logger = new Logger();