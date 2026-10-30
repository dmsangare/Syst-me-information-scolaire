export default () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  APP_NAME: process.env.APP_NAME || 'SIS-MALI',
  APP_URL: process.env.APP_URL || 'http://localhost',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  TZ: process.env.TZ || 'Africa/Bamako',
  database: { url: process.env.DATABASE_URL },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockDurationMinutes: parseInt(process.env.LOCK_DURATION_MINUTES || '15', 10),
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10),
  },
  storage: {
    root: process.env.STORAGE_ROOT || './storage',
    documents: process.env.STORAGE_DOCUMENTS || './storage/documents',
    uploads: process.env.STORAGE_UPLOADS || './storage/uploads',
    backups: process.env.STORAGE_BACKUPS || './storage/backups',
    generated: process.env.STORAGE_GENERATED || './storage/generated',
    maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10),
  },
  pdf: {
    locale: process.env.PDF_LOCALE || 'fr-FR',
  },
  defaults: {
    country: process.env.DEFAULT_COUNTRY || 'ML',
    timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Bamako',
    currency: process.env.DEFAULT_CURRENCY || 'FCFA',
    locale: process.env.DEFAULT_LOCALE || 'fr-FR',
  },
});