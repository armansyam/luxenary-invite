import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { composeTemplateData } from "./themeEngine";
import { renderTemplateFile, extractRenderedLabels, labelKeysWithClientData } from "./renderTemplate";
import { parseFeatureSettings } from "./featureSettings";

/**
 * Melengkapi `featureSettings.customLabels` undangan non-pernikahan dengan teks yang tampil di tema terpilih untuk
 * jenis acara undangan itu (token jenis acara, label Studio Demo tema sejenis, teks master). Blueprint tema satu nama
 * berisi cadangan pernikahan ("THE COUPLE"), jadi label bawaan tidak diambil dari blueprint. Render ini juga membuat
 * piring `data/drafts/<id>.html`. Label yang sudah tersimpan tetap menang; label yang teks masternya memuat data
 * klien (tanggal, nama) tidak dibekukan agar tetap mengikuti isian.
 */
/** Menyalin master terpilih ke piring `data/drafts/<id>.html` lewat satu render, saat klien memilih tema. */
export async function copyMasterToDraft(invitationId: string): Promise<void> {
  const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { themeId: true, eventType: true } });
  const data = await composeTemplateData(invitationId);
  if (!data || !inv.themeId) return;
  await renderTemplateFile(inv.themeId, data as any, { editMode: false, invitationId, eventType: inv.eventType });
}

export async function seedRenderedLabels(invitationId: string): Promise<Record<string, string>> {
  const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { themeId: true, eventType: true } });
  const data = await composeTemplateData(invitationId);
  if (!data || !inv.themeId) return {};
  const html = await renderTemplateFile(inv.themeId, data as any, { editMode: false, invitationId, eventType: inv.eventType });
  const rendered = extractRenderedLabels(html);
  const draft = await readFile(path.join(process.cwd(), "data", "drafts", `${invitationId}.html`), "utf-8");
  for (const key of labelKeysWithClientData(draft)) delete rendered[key];

  const current = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { featureSettings: true } });
  const fs = parseFeatureSettings(current.featureSettings);
  const clientLabels = (fs.customLabels as Record<string, string>) || {};
  const customLabels = { ...rendered, ...clientLabels };
  // Snapshot label awal (tanpa hasil edit klien) dipakai untuk membedakan label yang belum diubah saat tema diganti.
  const labelDefaults = Object.fromEntries(Object.entries(rendered).filter(([key]) => !(key in clientLabels)));
  await prisma.invitation.update({ where: { id: invitationId }, data: { featureSettings: { ...fs, customLabels, labelDefaults: { ...((fs.labelDefaults as Record<string, string>) || {}), ...labelDefaults } } as never } });
  return customLabels;
}
