// Mengubah DATABASE_URL (format Prisma/pg) menjadi variabel lingkungan libpq untuk pg_dump/pg_restore/psql.
//
// Password di .env dapat memuat karakter mentah seperti '@', '#', '/', atau '!' yang tidak di-encode. Parser URL
// libpq membelah pada '@' pertama dan parser WHATWG URL memperlakukan '#' sebagai awal fragmen, sehingga keduanya
// salah membaca host. Di sini string dibelah pada '@' TERAKHIR: host, port, dan nama database tidak pernah memuat '@'.
// Kredensial dikirim lewat PG* (bukan argumen baris perintah) agar tidak tampil di daftar proses maupun log deploy.
//
// Pemakaian: eval "$(DB_URL="$DATABASE_URL" node scripts/pg-env.cjs)"
const raw = process.env.DB_URL;
if (!raw) {
  console.error("pg-env: DB_URL kosong");
  process.exit(1);
}

const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\/(.*)$/is.exec(raw);
if (!schemeMatch) {
  console.error("pg-env: DB_URL bukan URL koneksi (skema://...)");
  process.exit(1);
}

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    // Memuat '%' literal yang bukan escape valid: pakai apa adanya.
    return value;
  }
};

const rest = schemeMatch[1];
const at = rest.lastIndexOf("@");
const userInfo = at >= 0 ? rest.slice(0, at) : "";
const location = (at >= 0 ? rest.slice(at + 1) : rest).split("?")[0];

const colon = userInfo.indexOf(":");
const user = colon >= 0 ? userInfo.slice(0, colon) : userInfo;
const password = colon >= 0 ? userInfo.slice(colon + 1) : "";

const slash = location.indexOf("/");
const hostPort = slash >= 0 ? location.slice(0, slash) : location;
const database = slash >= 0 ? location.slice(slash + 1) : "";

let host = hostPort;
let port = "5432";
if (hostPort.startsWith("[")) {
  const end = hostPort.indexOf("]");
  host = hostPort.slice(1, end);
  if (hostPort[end + 1] === ":") port = hostPort.slice(end + 2) || port;
} else {
  const portAt = hostPort.lastIndexOf(":");
  if (portAt >= 0) {
    host = hostPort.slice(0, portAt);
    port = hostPort.slice(portAt + 1) || port;
  }
}

if (!host || !database) {
  console.error("pg-env: host atau nama database tidak ditemukan pada DB_URL");
  process.exit(1);
}

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
const vars = {
  PGHOST: host,
  PGPORT: port,
  PGUSER: decode(user),
  PGPASSWORD: decode(password),
  PGDATABASE: decode(database),
};

console.log(Object.entries(vars).map(([key, value]) => `export ${key}=${shellQuote(value)}`).join("\n"));
