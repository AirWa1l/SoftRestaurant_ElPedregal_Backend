process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/elpedregal-test";
process.env.JWT_SECRET = "test-jwt-secret-min-length";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_DAYS = "7";
process.env.RESET_TOKEN_SECRET = "test-reset-token-secret";
process.env.RESET_TOKEN_EXPIRES_MINUTES = "60";
process.env.BCRYPT_ROUNDS = "12";
process.env.COOKIE_NAME = "refresh_token";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_DOMAIN = "";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.EMAIL_FROM = "El Pedregal <test@example.com>";
process.env.GMAIL_USER = "";
process.env.GMAIL_APP_PASSWORD = "";
process.env.FRONTEND_URL = "http://localhost:5173";
