// Runtime Node dapat dipisah per aplikasi: NODE_BIN_DIR di .env menunjuk folder bin Node khusus aplikasi ini
// (mis. /home/amsdev/node22/bin), sehingga aplikasi lain di server yang sama tetap memakai Node sistem.
// PM2 mode cluster mengabaikan `interpreter` (worker di-fork dari daemon PM2 dan memakai Node milik daemon),
// jadi dengan NODE_BIN_DIR aplikasi berjalan fork mode 1 instance; tanpa NODE_BIN_DIR tetap cluster di Node sistem.
// Hanya NODE_BIN_DIR yang dibaca; .env tidak dimuat ke process.env karena PM2 menyimpan env pemanggil dan nilainya
// akan mengalahkan .env milik Next (rahasia tertulis di dump.pm2, rotasi kredensial tidak berlaku setelah restart).
const fs = require('fs');
const envPath = `${__dirname}/.env`;
const nodeBinDir = fs.existsSync(envPath) ? require('dotenv').parse(fs.readFileSync(envPath)).NODE_BIN_DIR : undefined;

module.exports = {
  apps: [
    {
      name: 'luxenary-invite',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      ...(nodeBinDir
        ? { interpreter: `${nodeBinDir}/node`, instances: 1, exec_mode: 'fork' }
        : { instances: 'max', exec_mode: 'cluster' }),
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
