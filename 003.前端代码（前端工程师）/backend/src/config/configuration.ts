import { registerAs } from '@nestjs/config';

/**
 * 应用配置。所有可调项集中在这里，通过环境变量注入，禁止散落在业务代码中。
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}));

export const databaseConfig = registerAs('database', () => ({
  type: (process.env.DB_TYPE ?? 'sqlite') as 'sqlite' | 'mysql',
  database: process.env.DB_DATABASE ?? './data/material-system.sqlite',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'please-change-this-secret-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? '5', 10),
  loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES ?? '15', 10),
  resetCodeTtlMinutes: parseInt(process.env.RESET_CODE_TTL_MINUTES ?? '10', 10),
  resetCodeMaxPerHour: parseInt(process.env.RESET_CODE_MAX_PER_HOUR ?? '3', 10),
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin',
}));

export const configs = [appConfig, databaseConfig, authConfig];
