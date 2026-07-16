module.exports = {
  apps: [
    {
      name: "linkedin-scheduler",
      script: "./scripts/pc-scheduler.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      min_uptime: "60s",
      max_restarts: 5,
      restart_delay: 30000,
      kill_timeout: 10000,

      env: {
        NODE_ENV: "development",
        ACCOUNT_ID: "account_1",
        ACTUALLY_SEND: "true",
        ACTUALLY_COMMENT: "true",
        HEADLESS: "false",           // ← Visible browser (dev/testing)
        TZ: "Asia/Kolkata",
      },

      env_production: {
        NODE_ENV: "production",
        ACCOUNT_ID: "account_1",
        ACTUALLY_SEND: "true",
        ACTUALLY_COMMENT: "true",
        HEADLESS: "true",            // ← Hidden browser (production)
        TZ: "Asia/Kolkata",
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
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      min_uptime: "30s",
      max_restarts: 5,
      restart_delay: 10000,

      env: {
        NODE_ENV: "development",
        PORT: 3001,
        TZ: "Asia/Kolkata",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
        TZ: "Asia/Kolkata",
      },

      error_file: "./data/logs/api-error.log",
      out_file: "./data/logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      time: true,
    },
  ],
};