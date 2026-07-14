module.exports = {
  apps: [
    {
      name: "linkedin-scheduler",
      script: "./scripts/pc-scheduler.js",
      interpreter: "C:/Users/kriscent15/.bun/bin/bun.exe",
      instances: 1,           // CRITICAL: Only 1 instance (never 2)
      autorestart: true,
      watch: false,           // Don't restart on file change
      max_memory_restart: "2G",
      min_uptime: "60s",      // Consider crashed if dies within 60s
      max_restarts: 5,        // Stop trying after 5 crashes
      restart_delay: 30000,   // Wait 30s before restart

      // ═══ SAFE MODE (default — dry run) ═══
      env: {
        NODE_ENV: "development",
        ACCOUNT_ID: "account_1",
        ACTUALLY_SEND: "false",
        ACTUALLY_COMMENT: "false",
      },

      // ═══ PRODUCTION MODE (real send) ═══
      env_production: {
        NODE_ENV: "production",
        ACCOUNT_ID: "account_1",
        ACTUALLY_SEND: "true",
        ACTUALLY_COMMENT: "true",
      },

      error_file: "./data/logs/scheduler-error.log",
      out_file: "./data/logs/scheduler-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      time: true,
    },
    {
      name: "linkedin-api",
      script: "./server.js",
      interpreter: "C:/Users/kriscent15/.bun/bin/bun.exe",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "./data/logs/api-error.log",
      out_file: "./data/logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};