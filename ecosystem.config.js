module.exports = {
  apps: [
    {
      name: 'luxenary-invite',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '450M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true
    }
  ]
};
