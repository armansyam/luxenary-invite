/**
 * Skrip cron yang mengirim denyut ke pemantau eksternal: scripts/health-watch.sh dan scripts/cron-backup.sh.
 * Server HTTP palsu menggantikan aplikasi dan layanan pemantau; skrip dijalankan di folder sementara.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import type { AddressInfo } from "net";

const run = promisify(execFile);
const SCRIPTS = ["health-watch.sh", "cron-backup.sh", "lib-heartbeat.sh"];

let server: http.Server;
let base = "";
let workDir = "";
let hits: string[] = [];
let healthStatus = 200;
let backupBody = "";

async function runScript(script: string, env: Record<string, string> = {}) {
  try {
    const { stdout } = await run("bash", [path.join(workDir, "scripts", script)], {
      cwd: workDir,
      env: {
        ...process.env,
        HEALTHCHECK_PING_URL: "",
        HEALTHCHECK_BACKUP_PING_URL: "",
        HEALTH_URL: `${base}/api/health`,
        APP_URL: base,
        ...env,
      },
    });
    return { code: 0, stdout };
  } catch (err) {
    return { code: (err as { code: number }).code, stdout: "" };
  }
}

const read = (file: string) => fs.readFileSync(path.join(workDir, file), "utf8");

describe("heartbeat ke pemantau eksternal", () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits.push(`${req.method} ${req.url}`);
      if (req.url === "/api/health") {
        res.statusCode = healthStatus;
        res.end('{"status":"x"}');
      } else if (req.url === "/api/cron/backup") {
        res.end(backupBody);
      } else {
        res.end("OK");
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    hits = [];
    healthStatus = 200;
    backupBody = "";
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "heartbeat-"));
    for (const dir of ["scripts", "data", "logs"]) fs.mkdirSync(path.join(workDir, dir));
    for (const name of SCRIPTS) fs.copyFileSync(path.join(process.cwd(), "scripts", name), path.join(workDir, "scripts", name));
    fs.writeFileSync(path.join(workDir, "data", ".cron-auth"), "Authorization: Bearer uji\n");
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  describe("health-watch.sh", () => {
    it("aplikasi sehat -> denyut sukses, tanpa /fail", async () => {
      const res = await runScript("health-watch.sh", { HEALTHCHECK_PING_URL: `${base}/ping/hc` });
      expect(res.code).toBe(0);
      expect(hits).toContain("GET /ping/hc");
      expect(hits.some((h) => h.includes("/fail"))).toBe(false);
    });

    it("aplikasi menjawab 503 -> denyut /fail", async () => {
      healthStatus = 503;
      await runScript("health-watch.sh", { HEALTHCHECK_PING_URL: `${base}/ping/hc` });
      expect(hits).toContain("GET /ping/hc/fail");
      expect(hits).not.toContain("GET /ping/hc");
    });

    it("tanpa URL pemantau -> tidak mengirim apa pun dan tidak error", async () => {
      const res = await runScript("health-watch.sh");
      expect(res.code).toBe(0);
      expect(hits).toEqual(["GET /api/health"]);
    });

    it("URL pemantau dibaca dari .env bila tidak ada di lingkungan", async () => {
      fs.writeFileSync(path.join(workDir, ".env"), `HEALTHCHECK_PING_URL="${base}/ping/dari-env"\n`);
      await runScript("health-watch.sh");
      expect(hits).toContain("GET /ping/dari-env");
    });

    it("pemantau tidak terjangkau tidak menggagalkan skrip", async () => {
      const res = await runScript("health-watch.sh", { HEALTHCHECK_PING_URL: "http://127.0.0.1:1/ping/mati" });
      expect(res.code).toBe(0);
    });
  });

  describe("cron-backup.sh", () => {
    it("snapshot dibuat dan terunggah off-site -> denyut sukses", async () => {
      backupBody = '{"success":true,"message":"Auto-backup berhasil dijalankan."}';
      const res = await runScript("cron-backup.sh", { HEALTHCHECK_BACKUP_PING_URL: `${base}/ping/bk` });
      expect(res.code).toBe(0);
      expect(hits).toContain("POST /api/cron/backup");
      expect(hits).toContain("GET /ping/bk");
      expect(read("logs/cron-backup.log")).toContain("backup berhasil");
    });

    it("unggahan off-site gagal (ada warning) -> denyut /fail dan exit 1", async () => {
      backupBody = '{"success":true,"warning":"Snapshot tersimpan lokal tetapi unggahan off-site ke R2/S3 gagal."}';
      const res = await runScript("cron-backup.sh", { HEALTHCHECK_BACKUP_PING_URL: `${base}/ping/bk` });
      expect(res.code).toBe(1);
      expect(hits).toContain("GET /ping/bk/fail");
      expect(read("logs/cron-backup.log")).toContain("backup GAGAL");
    });

    it("auto-backup dinonaktifkan -> dilaporkan gagal", async () => {
      backupBody = '{"success":false,"message":"Auto-backup sedang dinonaktifkan di pengaturan."}';
      const res = await runScript("cron-backup.sh", { HEALTHCHECK_BACKUP_PING_URL: `${base}/ping/bk` });
      expect(res.code).toBe(1);
      expect(hits).toContain("GET /ping/bk/fail");
    });

    it("aplikasi tidak menjawab -> dilaporkan gagal", async () => {
      const res = await runScript("cron-backup.sh", { APP_URL: "http://127.0.0.1:1", HEALTHCHECK_BACKUP_PING_URL: `${base}/ping/bk` });
      expect(res.code).toBe(1);
      expect(hits).toContain("GET /ping/bk/fail");
    });

    it("URL pemantau tidak ditulis ke log", async () => {
      backupBody = '{"success":true}';
      await runScript("cron-backup.sh", { HEALTHCHECK_BACKUP_PING_URL: `${base}/ping/rahasia-xyz` });
      expect(read("logs/cron-backup.log")).not.toContain("rahasia-xyz");
    });
  });
});
