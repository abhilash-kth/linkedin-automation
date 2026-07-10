module.exports = {
  apps: [
    {
      name: "linkedin-scheduler",
      script: "./scripts/pc-scheduler.js",
      interpreter: "C:/Users/kriscent15/.bun/bin/bun.exe",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
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