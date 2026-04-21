# Design System Document: The Gilded Anthology

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Collector"**
This design system moves away from the sterile, "app-like" feel of contemporary reading platforms and moves toward the atmosphere of a private, high-end library. We are building a digital sanctuary for literature. To achieve this, the system breaks the traditional "flat" grid by employing **Intentional Asymmetry** and **Tonal Depth**. Elements should feel layered and curated, like a physical collection of leather-bound manuscripts viewed under soft ambient light.

The goal is to provide a "High-End Editorial" experience where the interface recedes to let the prose shine, yet feels undeniably premium when interacted with.

---

## 2. Colors: The Atmosphere of Ink and Gold
The palette is rooted in a "Deep Black" foundation, using Gold to denote prestige and Blue/Green for functional utility.

### Surface Hierarchy & Nesting
We do not use borders to define space. We use **Tonal Layering**. 
- **Base Canvas:** `surface` (#131313).
- **Recessed Areas (Inputs/Search):** `surface_container_lowest` (#0e0e0e).
- **Raised Elements (Cards/Modals):** `surface_container_high` (#2a2a2a) or `surface_container_highest` (#353535).

### The Rules of Engagement
*   **The "No-Line" Rule:** Prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts.
*   **The "Glass & Gradient" Rule:** Floating elements (Navigation bars, hover cards) must use Glassmorphism. Apply `surface` color at 80% opacity with a `24px` backdrop-blur.
*   **Signature Textures:** For primary Call-to-Actions (CTAs) and Hero highlights, use a subtle linear gradient: `primary` (#f2ca50) to `primary_container` (#d4af37). This prevents the "flat mustard" look and adds a metallic shimmer.

---

## 3. Typography: The Editorial Voice
We use a dual-font strategy to balance mechanical precision with literary elegance.

*   **The Storyteller (Serif):** `notoSerif` is reserved for the soul of the platform—book titles, chapter headings, and the long-form reading experience. It conveys authority and timelessness.
*   **The Curator (Sans-Serif):** `manrope` handles the UI logistics. It is clean, modern, and highly legible at small sizes (Labels/Metadata).

**Scale Application:**
- **Display-LG/MD:** Used for Hero book titles. Tracking should be set to `-0.02em` for a tighter, editorial feel.
- **Headline-SM:** Used for section headers (e.g., "Recently Read"). Always in `notoSerif` and tinted with `primary`.
- **Body-LG:** The primary reading size. Set `line-height` to `1.6` for maximum legibility against the dark background.

---

## 4. Elevation & Depth
In this system, depth is a physical property, not a stylistic choice.

*   **The Layering Principle:** Stacking determines importance. A `surface_container_low` card sitting on a `surface` background creates a natural, soft lift. 
*   **Ambient Shadows:** For high-level floating elements (like the pen nib logo menu), use extra-diffused shadows. 
    - *Values:* `0px 12px 32px rgba(0, 0, 0, 0.5)`. 
    - Never use pure black shadows on a dark background; ensure the shadow blends into the `surface_container_lowest`.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use for persistent navigation. It allows the cover art of novels to bleed through the UI as the user scrolls, creating a sense of immersion.

---

## 5. Components: The Physicality of the UI

### Buttons (The Interaction Layer)
*   **Primary (Utility):** Using `secondary_container` (Navy Blue). Use for "Upload" or "Edit." Shape: `md` (0.375rem) roundedness.
*   **Brand (Primary):** Using the Gold gradient. Reserved for "Read Now," "Subscribe," or the "Pen Nib" logo interaction.
*   **Success:** Using Deep Green (mapped to a custom success token) for "Publish."
*   **Ghost:** Use `on_surface` text with no background. On hover, shift background to `surface_variant`.

### Cards & Novel Displays
*   **The Cover-First Rule:** Book covers are the primary visual. Cards should have no borders and no background. Use `surface_container_low` only on hover to provide a "lift" effect.
*   **Metadata:** Use `label-md` in `on_surface_variant` for author names and word counts.

### Input Fields
*   **Style:** Minimalist. No bounding box. Only a `surface_container_lowest` background with a `1px` bottom-weighted highlight in `outline_variant`.
*   **Focus State:** The bottom highlight transitions to `primary` (Gold).

### Reading Interface
*   **The "Focus" Mode:** All UI elements (Nav, Buttons) fade to 20% opacity during active reading.
*   **Typography:** Default to `notoSerif` Body-LG. 
*   **Iconography:** All icons (Bookmark, Settings, Font Size) must be minimalist Gold (`primary`) strokes. Use 1.5px line weight.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use generous white space (vertical padding) to separate sections instead of divider lines.
*   **Do** use `primary_fixed_dim` for icons to ensure they don't "glow" too harshly against the black.
*   **Do** prioritize the reading experience. The UI is a frame, not the picture.

### Don’t:
*   **Don’t** use `tertiary` (Red) for anything other than destructive actions (Delete, Block, Error).
*   **Don’t** use pure `#FFFFFF` for text. Always use `on_surface` (#e2e2e2) to reduce eye strain in dark mode.
*   **Don’t** use high-contrast "Primary Blue" for interactive elements; stick to the muted, sophisticated Navy/Blue tones provided in the `secondary` scale.
*   **Don’t** use the `full` roundedness (pills) for anything except small category chips. All major containers use `md` or `lg` to maintain a professional, architectural feel.