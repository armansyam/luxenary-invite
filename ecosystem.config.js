module.exports = {
  apps: [
    {
      name: 'luxenary-invite',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max', // Gunakan seluruh core CPU untuk performa maksimal
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true
    }
  ]
};
