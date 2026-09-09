# LUXVITE — Landing Page Redesign Specification

> **Status:** Ready for implementation  
> **Product:** Luxvite — Digital Wedding Invitation  
> **Primary goal:** Make the Luxvite homepage feel like a premium wedding editorial / cinematic experience rather than a conventional SaaS landing page.

---

# 1. Design Direction

## Core concept

**Dark cinematic + luxury editorial + wedding photography + cultural storytelling.**

The landing page must communicate:

> **Your story, beautifully invited.**

The visitor should feel that Luxvite is a premium wedding brand before they even understand all of the technical features.

Do **not** make the homepage look like:
- a generic SaaS dashboard
- a template marketplace
- a feature/pricing-heavy website
- a grid of ordinary cards
- a typical corporate landing page

Instead, make it feel closer to:
- luxury wedding editorial
- premium wedding photography portfolio
- cinematic wedding film
- modern fashion/editorial website

---

# 2. Existing Visual DNA

The existing invitation screenshot establishes a strong visual language that should be preserved as inspiration:

- Burgundy / deep wine
- Warm gold
- Black / near-black
- Warm ivory
- Wedding photography as the primary visual
- Elegant script typography for couple names
- Serif typography for premium editorial headings
- Cultural details and storytelling
- Strong contrast
- Large photographic compositions

Important:

**Do not copy the exact invitation layout into the Luxvite homepage.**

The invitation design is a product example.

The homepage should use the same visual DNA but present Luxvite as the brand behind the experience.

---

# 3. Brand Positioning

Luxvite should feel like:

> A premium digital wedding invitation experience.

Not simply:

> A website for making wedding invitations.

The emotional hierarchy should be:

```text
EMOTION
   ↓
VISUAL
   ↓
EXPERIENCE
   ↓
PRODUCT
   ↓
FEATURES
   ↓
PRICE
   ↓
CONVERSION
```

Never reverse this into:

```text
FEATURES
PRICE
FEATURES
PRICE
FEATURES
```

---

# 4. Main Hero Section

## Objective

Create an immediate "wow" moment.

The first viewport should be visually strong and minimal.

## Recommended structure

```text
┌───────────────────────────────────────────────┐
│                                               │
│ LUXVITE              Collections   Pricing    │
│                                Create →       │
│                                               │
│                                               │
│                 Your story,                   │
│            beautifully invited.               │
│                                               │
│      Digital wedding invitations crafted      │
│             around your story.                │
│                                               │
│        [ Explore invitations ]                │
│                                               │
│              ↓ Scroll to explore              │
│                                               │
└───────────────────────────────────────────────┘
```

## Background

Use a high-quality wedding photograph.

The image should:
- fill the viewport
- have subtle dark gradient overlay
- retain visible photographic detail
- have enough negative space for typography

Do not heavily blur the photograph.

## Animation

On page load:

1. Background image starts slightly zoomed.
2. Image slowly settles into position.
3. Logo fades in.
4. Main heading fades upward.
5. Description follows.
6. CTA appears last.

Recommended timing:

```text
Image:       1200–1800ms
Logo:         500ms
Heading:      700ms
Description:  500ms
CTA:          400ms
```

Keep animations elegant and slow.

Avoid excessive bounce effects.

---

# 5. Hero Copy

Primary recommended copy:

## Heading

> Your story,  
> beautifully invited.

## Supporting text

> Undangan digital yang dibuat untuk menceritakan kisah Anda.

## CTA

Primary:

> Explore Invitations

Secondary:

> Create Your Invitation

Alternative Indonesian copy:

> Sebuah kisah.  
> Sebuah undangan.

> Hadirkan hari istimewa Anda dengan pengalaman digital yang berkesan.

---

# 6. Navigation

Keep navigation minimal.

Recommended:

```text
LUXVITE

Collections
Experience
Pricing

Create Invitation →
```

Desktop:

- transparent initially
- overlays hero
- switches to solid/blurred background after scrolling
- sticky navigation

Mobile:

```text
LUXVITE                         ☰
```

Use a minimal fullscreen menu.

Do not create a large mega menu.

---

# 7. Collection Section

## Concept

Instead of showing template cards like a typical marketplace, create an editorial collection.

Heading:

> THE COLLECTION

Subheading:

> Invitations crafted for different stories.

---

# 8. Interactive Mockup Carousel

This is one of the most important sections.

Do NOT use a normal:

```text
< image >
< previous > < next >
```

Instead create a layered / stacked carousel.

## Desktop

```text
             ┌─────────────────────┐
             │                     │
     ┌───────┤       AURELIA       ├───────┐
     │       │                     │       │
     │       └─────────────────────┘       │
 KALANDRA                              PRAMESWARI
```

Center mockup:

- largest
- sharp
- fully visible

Side mockups:

- smaller
- slightly blurred
- lower opacity
- partially outside viewport
- slightly rotated or offset

## Interaction

Support:

- mouse drag
- touch swipe
- trackpad
- keyboard arrow keys
- click side cards
- optional autoplay

On interaction:

```text
Current center
      ↓
moves left

Next card
      ↓
moves center

Previous card
      ↓
moves right
```

Use spring-like transitions.

Avoid aggressive 3D effects.

---

# 9. Collection Data Model

Example:

```js
const collections = [
  {
    name: "AURELIA",
    category: "Modern · Romantic",
    image: "/images/mockups/aurelia.jpg",
    accent: "warm"
  },
  {
    name: "KALANDRA",
    category: "Editorial · Contemporary",
    image: "/images/mockups/kalandra.jpg",
    accent: "dark"
  },
  {
    name: "PRAMESWARI",
    category: "Timeless · Cultural",
    image: "/images/mockups/prameswari.jpg",
    accent: "heritage"
  }
]
```

The implementation must make adding future templates easy.

Do not hardcode the carousel around exactly three templates.

---

# 10. Collection Interaction

When the user focuses a template:

Show:

```text
AURELIA
Modern · Romantic

[ View Invitation ]
```

Optional:

```text
01 / 06
```

The counter should update dynamically.

Example:

```text
01 / 06
02 / 06
03 / 06
```

---

# 11. Scroll Storytelling

The homepage should use scroll as a storytelling mechanism.

Do not make every section simply appear one after another.

Recommended transitions:

```text
Hero
 ↓
Photo scales down
 ↓
Mockup enters
 ↓
Mockup expands
 ↓
Feature content appears
 ↓
Mockup changes
 ↓
Next story
```

Use scroll-driven animation carefully.

Recommended technologies:

- CSS transitions
- IntersectionObserver
- requestAnimationFrame where necessary
- optional Framer Motion / Motion
- optional GSAP only if already part of the project

Do not introduce a large animation dependency unless necessary.

---

# 12. Section: More Than An Invitation

Heading:

> MORE THAN AN INVITATION.

Supporting copy:

> One beautiful experience, from the first impression to the last guest.

Visual:

A large smartphone mockup.

As the user scrolls, the phone content changes.

---

# 13. Interactive Phone Showcase

Phone states:

## State 1 — Invitation

Show the hero of a wedding invitation.

Label:

> Your first impression.

## State 2 — RSVP

Show RSVP interface.

Label:

> Know who's coming.

## State 3 — Guest Book

Show guest messages.

Label:

> Keep every message.

## State 4 — QR Check-in

Show guest check-in interface.

Label:

> Welcome your guests seamlessly.

## State 5 — WhatsApp

Show invitation sharing / WhatsApp experience.

Label:

> Share every invitation personally.

The phone should remain visually stable while its content transitions.

---

# 14. Section: From Invitation To Reception

This section should highlight the platform experience.

Headline:

> FROM INVITATION  
> TO RECEPTION.

Subheading:

> Luxvite stays with you throughout the celebration.

Visual concept:

```text
INVITATION
    ↓
RSVP
    ↓
GUEST LIST
    ↓
QR CHECK-IN
    ↓
RECEPTION
```

Animate the journey as the user scrolls.

---

# 15. QR Check-in Showcase

QR check-in is a good differentiator.

Do not describe it as a technical feature only.

Instead show an elegant reception dashboard.

Example:

```text
                  248
                GUESTS

        ─────────────────────

            ✓ 183 CHECKED IN

              65 EXPECTED

        ─────────────────────

             Reception Desk
```

Animate the numbers subtly.

Copy:

> A smoother welcome for every guest.

Avoid fake real-time data claims unless the product actually supports real-time updates.

---

# 16. Cultural Storytelling

Luxvite should not become another generic beige wedding brand.

The existing Bugis wedding visual is valuable because it shows that Luxvite can tell cultural stories.

Create a section:

> MADE TO FEEL LIKE YOU.

Supporting copy:

> From modern minimalism to rich cultural traditions, your invitation should feel like your story.

Possible categories:

```text
MODERN
Minimal · Editorial · Contemporary

ROMANTIC
Soft · Intimate · Floral

CULTURAL
Bugis · Jawa · Minang · Bali
```

Do not imply every cultural category is already available unless it exists.

Only display actual available collections.

---

# 17. Feature Presentation

Do not use a conventional icon grid.

Avoid:

```text
[icon] RSVP
[icon] WhatsApp
[icon] Guestbook
[icon] QR
```

Instead use large editorial blocks.

Example:

```text
01

RSVP

Know who's coming.

                 [large UI visual]
```

Then:

```text
02

GUEST BOOK

Keep every message.

                 [large UI visual]
```

Each feature gets room to breathe.

---

# 18. Pricing Section

Place pricing after the storytelling sections.

Heading:

> FIND YOUR STYLE.

Cards should be elegant and minimal.

Example:

### Traditional

**Rp80K**

For timeless celebrations.

### Modern

**Rp100K**

For contemporary love stories.

### Premium

**Rp120K**

For unforgettable moments.

Use the actual current Luxvite pricing in production.

CTA:

> Choose this experience →

Do not use aggressive sales language.

---

# 19. Final CTA

The final section should feel like the ending of a wedding film.

Use a full-width emotional wedding photograph.

Overlay:

> Your day deserves  
> a beautiful beginning.

Supporting:

> Create an invitation that feels as special as the moment itself.

CTA:

> START YOUR STORY →

This should be the strongest conversion point after the hero.

---

# 20. Footer

Minimal:

```text
LUXVITE

Digital Wedding Invitation

Collections
Experience
Pricing
FAQ
Contact

© Luxvite
```

Do not make the footer visually heavy.

---

# 21. Color System

Recommended base palette:

```css
--lux-black: #0B0A09;
--lux-charcoal: #151210;
--lux-burgundy: #3A0E18;
--lux-wine: #511522;
--lux-ivory: #F5F0E8;
--lux-warm-white: #FBF8F2;
--lux-gold: #C9A227;
--lux-muted-gold: #A88932;
--lux-gray: #9B948A;
```

Important:

Do not use gold everywhere.

Gold should be an accent.

Recommended ratio:

```text
Dark / neutral: 75%
Photography:    15%
Gold accent:    5%
Other:          5%
```

---

# 22. Typography

Use a combination of:

## Display Serif

For major headings.

Characteristics:

- elegant
- editorial
- high contrast
- sophisticated

Possible fonts:

- Cormorant Garamond
- DM Serif Display
- Playfair Display
- Instrument Serif

Use one primary serif, not all of them.

## Sans Serif

For:

- navigation
- descriptions
- buttons
- labels
- UI

Possible:

- Inter
- Manrope
- DM Sans
- Plus Jakarta Sans

## Script

Use sparingly.

Script should primarily represent:

- couple names
- special invitation content
- selected decorative moments

Do not use script for navigation or body text.

---

# 23. Image Direction

Photography is one of Luxvite's strongest assets.

Use:

- cinematic wedding photography
- editorial portraits
- cultural wedding moments
- intimate details
- reception atmosphere
- hands / rings / flowers / fabric
- architecture / venue

Avoid excessive stock-looking wedding photos.

Image treatment:

- subtle grain
- slow zoom
- subtle parallax
- cinematic cropping
- dark gradient where necessary

Do not over-filter.

---

# 24. Motion Design Principles

The animation style should feel:

- slow
- elegant
- deliberate
- smooth
- cinematic

Avoid:

- bouncing cards
- excessive rotations
- flashy particle effects
- huge spring overshoots
- constant movement
- animation on every tiny element

## Suggested easing

Use:

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

For elegant entrances.

For larger cinematic transitions use durations around:

```text
700ms – 1400ms
```

depending on distance and complexity.

---

# 25. Cursor Interaction

Desktop only.

Optional subtle effects:

- image follows cursor slightly
- mockup tilts 1–3 degrees
- CTA has magnetic hover
- images reveal subtle depth

Do not make the entire page follow the cursor.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Disable non-essential motion for users who prefer reduced motion.

---

# 26. Mobile Experience

Mobile is not a reduced desktop version.

Design specifically for mobile.

Hero:

```text
FULLSCREEN PHOTO

LUXVITE

Your story,
beautifully invited.

[ Explore ]
```

Carousel:

- one centered mockup
- swipe horizontally
- partial neighboring cards
- no tiny cards
- no hover-dependent interaction

Phone feature section:

- use vertical scroll
- content changes naturally
- avoid pinned sections that make scrolling frustrating

Buttons:

- minimum comfortable touch target
- full-width where appropriate
- clear hierarchy

---

# 27. Performance Requirements

Because the page is image-heavy, performance is critical.

Requirements:

- WebP / AVIF where possible
- responsive image sizes
- lazy-load below-the-fold images
- preload only hero image
- avoid loading every mockup at full resolution
- use responsive `srcset`
- compress videos
- use poster images for video
- avoid autoplay video with sound
- minimize JavaScript
- avoid unnecessary animation libraries

Target:

```text
LCP < 2.5s
CLS < 0.1
INP < 200ms
```

The visual quality must not come at the expense of mobile performance.

---

# 28. Accessibility

Requirements:

- semantic HTML
- proper heading hierarchy
- keyboard-accessible carousel
- visible focus state
- alt text for meaningful images
- decorative images marked appropriately
- sufficient text contrast
- reduced-motion support
- buttons must have clear accessible labels

Carousel must not be mouse-only.

---

# 29. Responsive Breakpoints

Suggested:

```text
Mobile:      < 640px
Tablet:      640–1023px
Desktop:     1024–1439px
Large:       ≥ 1440px
```

Do not blindly scale desktop.

Adjust:

- typography
- image crop
- mockup dimensions
- spacing
- carousel behavior
- navigation
- section height

per breakpoint.

---

# 30. Recommended Page Structure

Final DOM / component structure:

```text
LandingPage
│
├── Navbar
│
├── HeroSection
│   ├── HeroBackground
│   ├── BrandMark
│   ├── HeroHeading
│   ├── HeroDescription
│   └── HeroCTA
│
├── CollectionSection
│   ├── SectionHeading
│   ├── InvitationCarousel
│   └── CollectionMeta
│
├── StorySection
│   ├── StoryImage
│   └── StoryText
│
├── ExperienceSection
│   ├── PhoneMockup
│   ├── RSVP
│   ├── GuestBook
│   ├── CheckIn
│   └── WhatsApp
│
├── ReceptionSection
│   └── CheckInVisual
│
├── CulturalSection
│   └── CollectionCategories
│
├── PricingSection
│   └── PricingCards
│
├── FinalCTA
│
└── Footer
```

---

# 31. Component Recommendations

Suggested reusable components:

```text
<Navbar />

<Hero />

<SectionIntro />

<InvitationCarousel
  items={collections}
/>

<InvitationMockup />

<ScrollStory />

<PhoneExperience />

<FeatureShowcase />

<CheckInPreview />

<CollectionCategory />

<Pricing />

<FinalCTA />

<Footer />
```

Components should be data-driven wherever possible.

---

# 32. Interaction Rules

## Carousel

- Drag/swipe
- Keyboard arrows
- Click neighboring card
- Active center card
- Infinite loop if practical
- Smooth transition
- Optional autoplay
- Pause autoplay during interaction

## Hero

- slow image movement
- subtle text entrance

## Scroll

- section reveal
- image scale
- mockup transition
- phone content transition

## CTA

Hover:

```text
normal → slight lift → subtle glow
```

Do not create excessive button movement.

---

# 33. UX Rule

Every animation must answer one question:

> "Does this make the wedding story or product experience clearer?"

If not, remove it.

---

# 34. What NOT To Do

Do not:

- add excessive glassmorphism
- use generic purple/blue SaaS gradients
- use too many rounded cards
- put every feature in a small card
- use stock icons everywhere
- animate everything
- autoplay a loud video
- use huge gold text everywhere
- overload the hero with information
- show pricing before the visitor understands the product
- make mobile an afterthought

---

# 35. Suggested Landing Page Flow

Final experience:

```text
┌──────────────────────────────┐
│ HERO                         │
│                              │
│ Your story,                  │
│ beautifully invited.         │
│                              │
│ [Explore Invitations]        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ THE COLLECTION               │
│                              │
│ Interactive mockup carousel  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ MORE THAN AN INVITATION      │
│                              │
│ Phone experience             │
│ RSVP / Guestbook / QR / WA   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ FROM INVITATION TO RECEPTION │
│                              │
│ Guest journey                │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ MADE TO FEEL LIKE YOU       │
│                              │
│ Modern / Romantic / Cultural │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ FIND YOUR STYLE              │
│                              │
│ Pricing                      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ YOUR DAY DESERVES            │
│ A BEAUTIFUL BEGINNING.       │
│                              │
│ [START YOUR STORY]           │
└──────────────────────────────┘
```

---

# 36. Implementation Brief For Coding Agent

Build the Luxvite homepage as a **premium, cinematic, interactive wedding invitation landing page**.

The page must feel like a luxury wedding editorial, not a conventional SaaS website.

Primary visual language:

```text
dark cinematic
+
burgundy
+
warm gold
+
ivory
+
editorial typography
+
large wedding photography
```

Primary interaction:

```text
scroll-driven storytelling
+
interactive invitation carousel
+
animated phone showcase
+
subtle parallax
+
smooth transitions
```

The hero must immediately communicate:

> **Your story, beautifully invited.**

The invitation templates must be treated as a curated collection.

The homepage must sell the **experience and emotion first**, then explain the features and pricing.

Use real Luxvite assets where available.

Do not invent product functionality that does not exist.

Keep the code modular and data-driven.

Optimize for:

- mobile
- performance
- accessibility
- reduced motion
- SEO
- maintainability

---

# 37. Suggested Development Order

Implement in this order:

## Phase 1 — Foundation

1. Global colors
2. Typography
3. Layout system
4. Navbar
5. Responsive container
6. Global animation utilities

## Phase 2 — Hero

1. Hero image
2. Overlay
3. Typography
4. CTA
5. entrance animation
6. subtle parallax

## Phase 3 — Collection

1. Mockup assets
2. Carousel
3. Drag/swipe
4. keyboard support
5. active state
6. responsive behavior

## Phase 4 — Experience

1. Phone mockup
2. scroll state
3. RSVP state
4. Guest Book state
5. QR state
6. WhatsApp state

## Phase 5 — Supporting Sections

1. Reception
2. Cultural storytelling
3. Features
4. Pricing
5. Final CTA
6. Footer

## Phase 6 — Polish

1. Motion tuning
2. Mobile optimization
3. Image optimization
4. Accessibility
5. SEO
6. Performance audit

---

# 38. Acceptance Criteria

The implementation is successful when:

- The first viewport feels premium immediately.
- The homepage does not look like a generic SaaS template.
- Wedding photography is visually dominant.
- The interactive mockup carousel is one of the visual highlights.
- Scrolling feels like moving through a wedding story.
- Product features are demonstrated visually rather than dumped into cards.
- QR check-in and guest experience feel like part of the Luxvite journey.
- Pricing is easy to understand but not the first thing visitors see.
- Mobile feels intentional and polished.
- Animations remain subtle and performant.
- Reduced-motion users still get a complete experience.
- New invitation templates can be added without rewriting the carousel component.

---

# 39. Final Creative Direction

The single most important principle:

> **Do not make Luxvite look like a website that sells invitations.**
>
> **Make Luxvite look like the experience of discovering one.**

The visitor should leave the homepage thinking:

> "I want my wedding invitation to feel like this."

That emotional reaction is the primary conversion mechanism.

---

# 40. Reference To Existing Invitation Visual

The supplied Luxvite invitation screenshot should be treated as the visual reference for:

- burgundy
- warm gold
- cinematic photography
- cultural wedding identity
- elegant couple-name typography
- dark romantic atmosphere

However, the landing page must elevate this visual language into a **brand-level editorial experience** rather than reproducing the invitation screen.

