-- Varian Tema: tema baru yang menumpang ke master tulisan tangan (themes.parentTheme) dan menimpa variabel :root-nya.
-- Bentuk: { "colors": { "--var": "#rrggbb" }, "fonts": { "--lux-font-x": "<id font katalog atau g:Nama>" } }.
ALTER TABLE "themes" ADD COLUMN "master_overrides" JSONB;
