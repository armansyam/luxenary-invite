# UI Design & Clean Aesthetics Guidelines

## 1. No Default OS Emojis in Professional UI
- NEVER use default OS/system emojis (e.g. 🔒, ✏️, 💾, 💳, 🔑, 💰, 🌐, ⚡, 🧪, 🟢, ⚪, 📘, ❌, 👥, 💌, 🎟, 📊, 🎨, ⚙️, 🔍) in dashboard navigation, card headers, buttons, form labels, or status indicators.
- Use clean, modern SVG vector icons (Lucide / Heroicons style) or clean minimalist typography instead.
- Default emojis make modern web applications look unprofessional and cluttered.

## 2. Eliminate Redundant & Cluttering State Badges
- Do NOT add redundant status badges such as "🔒 Terkunci", "✏️ Mode Edit", or unnecessary decorative state tags in view modes.
- Keep cards clean, minimal, and elegant. Let subtle border rings or clean buttons convey state.

## 3. Professional SaaS Typography & Badge Standards
- Use refined, minimalist status badges (e.g., `<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Aktif</span>`).
- High contrast, crisp font hierarchy, and generous whitespace.
