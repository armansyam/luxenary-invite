// Runtime Node dapat dipisah per aplikasi: NODE_BIN_DIR di .env menunjuk folder bin Node khusus aplikasi ini
// (mis. /home/amsdev/node22/bin), sehingga aplikasi lain di server yang sama tetap memakai Node sistem.
// PM2 mode cluster mengabaikan `interpreter` (worker di-fork dari daemon PM2 dan memakai Node milik daemon),
// jadi dengan NODE_BIN_DIR aplikasi berjalan fork mode 1 instance; tanpa NODE_BIN_DIR tetap cluster di Node sistem.
// Hanya NODE_BIN_DIR yang dibaca; .env tidak dimuat ke process.env karena PM2 menyimpan env pemanggil dan nilainya
// akan mengalahkan .env milik Next (rahasia tertulis di dump.pm2, rotasi kredensial tidak berlaku setelah restart).
const fs = require('fs');
const envPath = `${__dirname}/.env`;
const dotenvValues = fs.existsSync(envPath) ? require('dotenv').parse(fs.readFileSync(envPath)) : {};
const nodeBinDir = dotenvValues.NODE_BIN_DIR;
// Server replika mendengarkan di alamat Tailscale-nya agar Caddy server utama dapat menjangkaunya; deploy.sh hanya
// menerima 127.0.0.1 atau alamat Tailscale (100.64.0.0/10), jadi port aplikasi tidak pernah terbuka ke internet.
const bindHost = dotenvValues.LUX_BIND_HOST || '127.0.0.1';
// Next.js 16 (NextURL) menormalisasi 127.0.0.1 -> localhost, sedangkan resolve-routes.js membangun initUrl dari
// argumen --hostname apa adanya. Memakai --hostname 127.0.0.1 membuat x-middleware-rewrite (localhost:3001) tidak
// cocok dengan initUrl (127.0.0.1:3001) sehingga rewrite diperlakukan sebagai proxy eksternal. Memakai --hostname
// localhost + --dns-result-order=ipv4first menjaga binding khusus di 127.0.0.1 (IPv4 loopback) sekaligus menyamakan
// origin initUrl & NextURL agar rewrite subdomain/custom domain berjalan 100% internal in-process.
const isLoopbackBind = bindHost === '127.0.0.1';
const nextHostname = isLoopbackBind ? 'localhost' : bindHost;
// Direktori build aktif (.next-a atau .next-b) ditulis deploy.sh setelah migrasi berhasil; tanpa berkas ini Next memakai .next.
const distFile = `${__dirname}/data/.dist-dir`;
const distDir = fs.existsSync(distFile) ? fs.readFileSync(distFile, 'utf8').trim() : '';

module.exports = {
  apps: [
    {
      name: 'luxenary-invite',
      script: 'node_modules/next/dist/bin/next',
      // Hanya Caddy (loopback 127.0.0.1) yang boleh menjangkau aplikasi. Tanpa --hostname Next mendengarkan di semua
      // antarmuka, sehingga port 3001 bisa dipanggil langsung dari internet dan header X-Real-IP dapat dipalsukan.
      args: `start --hostname ${nextHostname}`,
      ...(isLoopbackBind ? { node_args: '--dns-result-order=ipv4first' } : {}),
      ...(nodeBinDir
        ? { interpreter: `${nodeBinDir}/node`, instances: 1, exec_mode: 'fork' }
        : { instances: 'max', exec_mode: 'cluster' }),
      max_memory_restart: '450M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        ...(isLoopbackBind ? { NODE_OPTIONS: '--dns-result-order=ipv4first' } : {}),
        ...(['.next-a', '.next-b'].includes(distDir) ? { NEXT_DIST_DIR: distDir } : {})
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true
    }
  ]
};
