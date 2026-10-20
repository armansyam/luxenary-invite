/**
 * Demo tema dirender oleh engine undangan klien dari undangan virtual (DB luxenary_test untuk setelan paket).
 * Setiap tema: tidak ada token tersisa, nama persona demo tampil, ucapan contoh tampil, dan label Studio Demo berlaku.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile, THEME_MAP } from "@/lib/renderTemplate";
import { getDemoThemeData } from "@/lib/demoRegistry";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");

const masterPath = (themeId: string) => {
  const info = THEME_MAP[themeId];
  return path.join(process.cwd(), "themes", info.eventType === "gathering" ? "general" : info.eventType, info.style, info.file);
};

const personaName = (themeId: string) => {
  const d = getDemoThemeData(themeId) as any;
  return d.groomName && (!d.eventType || d.eventType === "WEDDING") ? d.groomName : d.personNickname || d.childNickname || d.babyNickname || d.graduateNickname || d.eventTitle;
};

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe.skipIf(!IS_TEST_DB)("demo memakai engine klien", () => {
  it("semua tema: tanpa token tersisa, persona dan ucapan contoh tampil", async () => {
    const problems: string[] = [];
    for (const themeId of Object.keys(THEME_MAP)) {
      const inv = buildDemoInvitation(themeId);
      const html = await renderTemplateFile(themeId, (await composeInvitationData(inv)) as any, { editMode: false, invitationId: inv.id });
      const leftover = html.match(/\{\{[^}]*\}\}/g);
      if (leftover) problems.push(`${themeId}: token ${leftover.slice(0, 3).join(" ")}`);
      if (!html.includes(personaName(themeId).replace(/&/g, "&amp;"))) problems.push(`${themeId}: persona ${personaName(themeId)} tidak tampil`);
      // Sebagian master memuat ucapan lewat JavaScript dari /api/public/rsvp (ID demo- dijawab data contoh), bukan dari HTML.
      const bakesWishes = /\{\{\s*(wishesHtml|wishesSectionHtml)\s*\}\}/.test(fs.readFileSync(masterPath(themeId), "utf-8"));
      if (bakesWishes && !html.includes(inv.rsvps[0].guestName.replace(/&/g, "&amp;"))) problems.push(`${themeId}: ucapan contoh tidak tampil`);
    }
    expect(problems).toEqual([]);
  }, 120000);

  it("label kustom dari Studio Demo berlaku", async () => {
    for (const themeId of ["kalandra", "al-khalid"]) {
      const inv = buildDemoInvitation(themeId, { customLabels: { rsvpTitle: "LABEL_UJI_DEMO" } });
      const html = await renderTemplateFile(themeId, (await composeInvitationData(inv)) as any, { editMode: false, invitationId: inv.id });
      expect(html, themeId).toContain("LABEL_UJI_DEMO");
    }
  });

  it("formulir RSVP demo mengirim ke ID demo yang dijawab data contoh oleh rute RSVP", async () => {
    const inv = buildDemoInvitation("kalandra");
    const html = await renderTemplateFile("kalandra", (await composeInvitationData(inv)) as any, { editMode: false, invitationId: inv.id });
    expect(inv.id.startsWith("demo-")).toBe(true);
    expect(html).toContain(inv.id);
  });

  it("master satu nama: setiap slot media menerima video dan foto beranda/penutup", async () => {
    const slots = ["LANDING_COVER", "DESKTOP_SIDEBAR", "GLOBAL_FIXED_BG", "HOME_PHOTO", "CLOSING_COVER"];
    const videoClasses = ["lux-cover-video", "lux-sidebar-video", "lux-fixed-bg-video", "lux-home-video", "lux-closing-video"];
    for (const themeId of ["toga", "buaian", "fajar", "riang", "prakarsa"]) {
      const inv = buildDemoInvitation(themeId);
      inv.media = slots.map((mediaSlot) => ({ mediaSlot, localPath: `/uploads/uji/${mediaSlot.toLowerCase()}.mp4` }));
      const html = await renderTemplateFile(themeId, (await composeInvitationData(inv)) as any, { editMode: false, invitationId: inv.id });
      for (const cls of videoClasses) expect(html, `${themeId} ${cls}`).toContain(`<video class="${cls}"`);

      const photoInv = buildDemoInvitation(themeId);
      photoInv.media = [{ mediaSlot: "HOME_PHOTO", localPath: "/uploads/uji/home.webp" }, { mediaSlot: "CLOSING_COVER", localPath: "/uploads/uji/closing.webp" }];
      const photoHtml = await renderTemplateFile(themeId, (await composeInvitationData(photoInv)) as any, { editMode: false, invitationId: photoInv.id });
      expect(photoHtml, `${themeId} home`).toContain("/uploads/uji/home.webp");
      expect(photoHtml, `${themeId} closing`).toContain('class="site-footer has-closing-photo"');
    }
  }, 60000);
});
