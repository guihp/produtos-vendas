// Configurações de autenticação
export const AUTH_CONFIG = {
  // Em produção, mova estas configurações para variáveis de ambiente
  ADMIN_USERNAME: "admin_seguro_2024",
  ADMIN_PASSWORD: "3sc0v4D3L1mp3z4@2024",
  SALT: "S3gur4nc4M4x1m4",
  SESSION_DURATION: 2 * 60 * 60 * 1000, // 2 horas em milissegundos
  BLOCK_DURATION_BASE: 2, // Base para cálculo do tempo de bloqueio (2^n segundos)
  MAX_BLOCK_DURATION: 30 * 60 * 1000, // Máximo 30 minutos
  MAX_LOGIN_ATTEMPTS: 3, // Número máximo de tentativas antes do bloqueio
  TOKEN_RENEWAL_THRESHOLD: 30 * 60 * 1000, // 30 minutos antes da expiração
}; 