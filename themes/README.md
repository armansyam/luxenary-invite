# themes/

Master tema undangan. Aturan letak satu-satunya, dijaga `__tests__/unit/themeFolders.test.ts`:

```
themes/
├── <folder-acara>/<gaya>/<id-tema>.html    master yang dirender mesin
└── _blueprints/<folder-acara>/             kerangka dan panduan untuk menulis atau merakit master baru
```

| Jenis acara (`EventType`) | `<folder-acara>` | Blueprint unduhan |
|---|---|---|
| WEDDING | `wedding` | `starter-blueprint-wedding.html` |
| BIRTHDAY | `birthday` | `starter-blueprint-birthday.html` |
| KHITAN | `khitan` | `starter-blueprint-khitan.html` |
| AQIQAH | `aqiqah` | `starter-blueprint-aqiqah.html` |
| WISUDA | `wisuda` | `starter-blueprint-wisuda.html` |
| GATHERING | **`general`** (satu-satunya pengecualian) | `starter-blueprint-general.html` |

- `<gaya>` salah satu dari `minimalist`, `modern`, `traditional` (kolom `themes.category`).
- `<id-tema>` huruf kecil, angka, dan tanda hubung; unik di seluruh folder; sama dengan `themes.id`.
- Pemetaan jenis acara ke folder, serta pembentukan path master, hanya ada di `lib/themePaths.ts`. Jangan menulis
  `"themes", "general"` atau `"themes", eventType.toLowerCase()` di tempat lain.
- Tidak ada master di luar pola ini (tidak ada `themes/<gaya>/` atau berkas langsung di `themes/`); jalur lama sudah
  dihapus dari renderer.
- Undangan klien tidak membaca master langsung: master disalin ke `data/drafts/<id-undangan>.html` saat tema dipilih
  (lihat `docs/SYSTEM_ARCHITECTURE.md`). Mengubah master tidak mengubah undangan yang sudah ada.
- Tema hasil Theme Builder (`/admin/theme-builder`) selalu `wedding/<gaya>/<id>.html` dan dikompilasi dari
  `_blueprints/wedding/starter-blueprint.html`.
