/**
 * Authentication and authorization for MCP
 */

import type { MCPAuthConfig, MCPSession } from '../utils/types.js';
import type { ILogger } from '../core/logger.js';
import type { MCPError } from '../utils/errors.js';
import { createHash, timingSafeEqual } from 'node:crypto';

export interface IAuthManager {
  authenticate(credentials: unknown): Promise<AuthResult>;
  authorize(session: MCPSession, permission: string): boolean;
  validateToken(token: string): Promise<TokenValidation>;
  generateToken(userId: string, permissions: string[]): Promise<string>;
  revokeToken(token: string): Promise<void>;
}

export interface AuthResult {
  success: boolean;
  user?: string;
  permissions?: string[];
  token?: string;
  error?: string;
}

export interface TokenValidation {
  valid: boolean;
  user?: string;
  permissions?: string[];
  expiresAt?: Date;
  error?: string;
}

/**
 * Authentication manager implementation
 */
export class AuthManager implements IAuthManager {
  private revokedTokens = new Set<string>();
  private tokenStore = new Map<
    string,
    {
      user: string;
      permissions: string[];
      createdAt: Date;
      expiresAt: Date;
    }
  >();

  constructor(
    private config: MCPAuthConfig,
    private logger: ILogger,
  ) {
    // Start token cleanup timer
    if (config.enabled) {
      setInterval(() => {
        this.cleanupExpiredTokens();
      }, 300000); // Clean up every 5 minutes
    }
  }

  async authenticate(credentials: unknown): Promise<AuthResult> {
    if (!this.config.enabled) {
      return {
        success: true,
        user: 'anonymous',
        permissions: ['*'],
      };
    }

    this.logger.debug('Authenticating credentials', {
      method: this.config.method,
      hasCredentials: !!credentials,
    });

    try {
      switch (this.config.method) {
        case 'token':
          return await this.authenticateToken(credentials);
        case 'basic':
          return await this.authenticateBasic(credentials);
        case 'oauth':
          return await this.authenticateOAuth(credentials);
        default:
          return {
            success: false,
            error: `Unsupported authentication method: ${this.config.method}`,
          };
      }
    } catch (error) {
      this.logger.error('Authentication error', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : 'Authentication failed',
      };
    }
  }

  authorize(session: MCPSession, permission: string): boolean {
    if (!this.config.enabled || !session.authenticated) {
      return !this.config.enabled; // If auth disabled, allow all
    }

    const permissions = session.authData?.permissions || [];

    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Check for exact permission match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for prefix-based permissions (e.g., "tools.*" matches "tools.list")
    for (const perm of permissions) {
      if (perm.endsWith('*') && permission.startsWith(perm.slice(0, -1))) {
        return true;
      }
    }

    this.logger.warn('Authorization denied', {
      sessionId: session.id,
      user: session.authData?.user,
      permission,
      userPermissions: permissions,
    });

    return false;
  }

  async validateToken(token: string): Promise<TokenValidation> {
    if (this.revokedTokens.has(token)) {
      return {
        valid: false,
        error: 'Token has been revoked',
      };
    }

    const tokenData = this.tokenStore.get(token);
    if (!tokenData) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    if (tokenData.expiresAt < new Date()) {
      this.tokenStore.delete(token);
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    return {
      valid: true,
      user: tokenData.user,
      permissions: tokenData.permissions,
      expiresAt: tokenData.expiresAt,
    };
  }

  async generateToken(userId: string, permissions: string[]): Promise<string> {
    const token = this.createSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.config.sessionTimeout || 3600000));

    this.tokenStore.set(token, {
      user: userId,
      permissions,
      createdAt: now,
      expiresAt,
    });

    this.logger.info('Token generated', {
      userId,
      permissions,
      expiresAt,
    });

    return token;
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
    this.tokenStore.delete(token);
    this.logger.info('Token revoked', { token: token.substring(0, 8) + '...' });
  }

  private async authenticateToken(credentials: unknown): Promise<AuthResult> {
    const token = this.extractToken(credentials);
    if (!token) {
      return {
        success: false,
        error: 'Token not provided',
      };
    }

    // Check if it's a stored token (generated by us)
    const validation = await this.validateToken(token);
    if (validation.valid) {
      return {
        success: true,
        user: validation.user!,
        permissions: validation.permissions!,
        token,
      };
    }

    // Check against configured static tokens
    if (this.config.tokens && this.config.tokens.length > 0) {
      const isValid = this.config.tokens.some((validToken) => {
        return this.timingSafeEqual(token, validToken);
      });

      if (isValid) {
        return {
          success: true,
          user: 'token-user',
          permissions: ['*'], // Static tokens get all permissions
          token,
        };
      }
    }

    return {
      success: false,
      error: 'Invalid token',
    };
  }

  private async authenticateBasic(credentials: unknown): Promise<AuthResult> {
    const { username, password } = this.extractBasicAuth(credentials);
    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password required',
      };
    }

    if (!this.config.users || this.config.users.length === 0) {
      return {
        success: false,
        error: 'No users configured',
      };
    }

    const user = this.config.users.find((u) => u.username === username);
    if (!user) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Verify password
    const isValidPassword = this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Generate a session token
    const token = await this.generateToken(username, user.permissions);

    return {
      success: true,
      user: username,
      permissions: user.permissions,
      token,
    };
  }

  private async authenticateOAuth(credentials: unknown): Promise<AuthResult> {
    // TODO: Implement OAuth authentication
    // This would typically involve:
    // 1. Validating JWT tokens
    // 2. Checking token expiration
    // 3. Extracting user info and permissions from token claims

    this.logger.warn('OAuth authentication not yet implemented');
    return {
      success: false,
      error: 'OAuth authentication not implemented',
    };
  }

  private extractToken(credentials: unknown): string | null {
    if (typeof credentials === 'string') {
      return credentials;
    }

    if (typeof credentials === 'object' && credentials !== null) {
      const creds = credentials as Record<string, unknown>;

      if (typeof creds.token === 'string') {
        return creds.token;
      }

      if (typeof creds.authorization === 'string') {
        const match = creds.authorization.match(/^Bearer\s+(.+)$/i);
        return match ? match[1] : null;
      }
    }

    return null;
  }

  private extractBasicAuth(credentials: unknown): { username?: string; password?: string } {
    if (typeof credentials === 'object' && credentials !== null) {
      const creds = credentials as Record<string, unknown>;

      if (typeof creds.username === 'string' && typeof creds.password === 'string') {
        return {
          username: creds.username,
          password: creds.password,
        };
      }

      if (typeof creds.authorization === 'string') {
        const match = creds.authorization.match(/^Basic\s+(.+)$/i);
        if (match) {
          try {
            const decoded = atob(match[1]);
            const colonIndex = decoded.indexOf(':');
            if (colonIndex >= 0) {
              return {
                username: decoded.substring(0, colonIndex),
                password: decoded.substring(colonIndex + 1),
              };
            }
          } catch {
            // Invalid base64
          }
        }
      }
    }

    return {};
  }

  private verifyPassword(providedPassword: string, storedPassword: string): boolean {
    // For now, using simple hash comparison
    // In production, use proper password hashing like bcrypt
    const hashedProvided = this.hashPassword(providedPassword);
    const hashedStored = this.hashPassword(storedPassword);

    return this.timingSafeEqual(hashedProvided, hashedStored);
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const bufferA = encoder.encode(a);
    const bufferB = encoder.encode(b);

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }

  private createSecureToken(): string {
    // Generate a secure random token
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    const hash = createHash('sha256')
      .update(`${timestamp}${random1}${random2}`)
      .digest('hex')
      .substring(0, 32);

    return `mcp_${timestamp}_${hash}`;
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [token, data] of this.tokenStore.entries()) {
      if (data.expiresAt < now) {
        this.tokenStore.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cleaned up expired tokens', { count: cleaned });
    }
  }
}

/**
 * Permission constants for common operations
 */
export const Permissions = {
  // System operations
  SYSTEM_INFO: 'system.info',
  SYSTEM_HEALTH: 'system.health',
  SYSTEM_METRICS: 'system.metrics',

  // Tool operations
  TOOLS_LIST: 'tools.list',
  TOOLS_INVOKE: 'tools.invoke',
  TOOLS_DESCRIBE: 'tools.describe',

  // Agent operations
  AGENTS_LIST: 'agents.list',
  AGENTS_SPAWN: 'agents.spawn',
  AGENTS_TERMINATE: 'agents.terminate',
  AGENTS_INFO: 'agents.info',

  // Task operations
  TASKS_LIST: 'tasks.list',
  TASKS_CREATE: 'tasks.create',
  TASKS_CANCEL: 'tasks.cancel',
  TASKS_STATUS: 'tasks.status',

  // Memory operations
  MEMORY_READ: 'memory.read',
  MEMORY_WRITE: 'memory.write',
  MEMORY_QUERY: 'memory.query',
  MEMORY_DELETE: 'memory.delete',

  // Administrative operations
  ADMIN_CONFIG: 'admin.config',
  ADMIN_LOGS: 'admin.logs',
  ADMIN_SESSIONS: 'admin.sessions',

  // Wildcard permission
  ALL: '*',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
