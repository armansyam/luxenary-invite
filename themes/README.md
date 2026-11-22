# themes/

Master tema undangan (81 tema fisik lintas 3 mode acara abadi). Aturan letak satu-satunya, dijaga `__tests__/unit/themeFolders.test.ts` dan `lib/themePaths.ts`:

```
themes/
├── <folder-acara>/<gaya>/<id-tema>.html    master yang dirender mesin
└── _blueprints/<folder-acara>/             kerangka mandiri untuk tiap mode acara
```

| Mode Acara (`EventType`) | `<folder-acara>` | Blueprint Theme Builder & Unduhan | Total Master Fisik |
|---|---|---|---:|
| `WEDDING` | `wedding` | `themes/_blueprints/wedding/starter-blueprint.html` | 34 |
| `PERSONAL` | `personal` | `themes/_blueprints/personal/starter-blueprint-personal.html` | 37 |
| `EVENT` | `event` | `themes/_blueprints/event/starter-blueprint-event.html` | 10 |

- `<gaya>` salah satu dari `minimalist`, `modern`, `traditional` (kolom `themes.category`).
- `<id-tema>` huruf kecil, angka, dan tanda hubung; unik di seluruh folder; sama dengan `themes.id`.
- Pemetaan mode acara ke folder serta pembentukan path master hanya ada di `lib/themePaths.ts` (`THEME_EVENT_TYPES = ["WEDDING", "PERSONAL", "EVENT"]`). Jangan menulis path folder tema secara manual di tempat lain.
- Tidak ada master di luar pola ini (folder lama `birthday/`, `khitan/`, `aqiqah/`, `wisuda/`, `general/`, `_blueprints/single-name/` sudah dihapus).
- Undangan klien tidak membaca master langsung: piring draf dibekukan di tabel `invitation_drafts` saat tema dipilih (lihat `docs/SYSTEM_ARCHITECTURE.md`). Mengubah master tidak mengubah undangan yang sudah ada.
- Tema hasil Theme Builder (`/admin/theme-builder`) ditulis ke `themes/<folder-acara>/<gaya>/<id>.html` sesuai mode acaranya menggunakan blueprint masing-masing mode (`wedding`, `personal`, atau `event`).
