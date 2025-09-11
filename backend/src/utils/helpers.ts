/**
 * Utility functions for CodeClimb backend
 */

/**
 * Generate a unique invite code for classrooms
 * @returns 8-character alphanumeric code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate hash for article URL
 * @param url Article URL
 * @returns Hash string for grouping implementations
 */
export function calculateArticleHash(url: string): string {
  // Simple hash function - could be replaced with crypto hash if needed
  let hash = 0;
  if (url.length === 0) return hash.toString();
  
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate file path for security
 * @param filePath File path to validate
 * @returns Whether the path is safe
 */
export function isValidFilePath(filePath: string): boolean {
  // Check for path traversal attacks
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }
  
  // Check for absolute paths (should be relative)
  if (filePath.startsWith('/') || filePath.match(/^[A-Za-z]:\\/)) {
    return false;
  }
  
  return true;
}

/**
 * Sanitize code content for storage
 * @param code Code content to sanitize
 * @returns Sanitized code
 */
export function sanitizeCode(code: string): string {
  // Remove null bytes and control characters except newlines and tabs
  return code.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Extract file extension from path
 * @param filePath File path
 * @returns File extension without dot
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot >= 0 ? filePath.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * Check if file is a code file based on extension
 * @param filePath File path
 * @returns Whether the file is a code file
 */
export function isCodeFile(filePath: string): boolean {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart', 'scala',
    'clj', 'hs', 'ml', 'f', 'pas', 'pl', 'r', 'sql', 'sh', 'bat',
    'ps1', 'html', 'css', 'scss', 'sass', 'less', 'xml', 'json',
    'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'
  ];
  
  const extension = getFileExtension(filePath);
  return codeExtensions.includes(extension);
}

/**
 * Format duration in milliseconds to human readable string
 * @param ms Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日${hours % 24}時間`;
  } else if (hours > 0) {
    return `${hours}時間${minutes % 60}分`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * Generate a random color for user avatars
 * @param seed Seed string (e.g., user ID)
 * @returns Hex color string
 */
export function generateAvatarColor(seed: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}