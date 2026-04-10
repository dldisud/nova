# INKROAD Pinterest-Style Full Redesign

## Design Decision Summary

| Decision | Choice |
|----------|--------|
| Scope | Full redesign — home, search, detail, library, auth |
| Hero style | Slim promo banner + masonry feed |
| Card hover | Info overlay — slide-up with rating, genre, price |
| Color scheme | Keep current (light bg #f7f5f2, dark text #1a1a1a, sale #e85d3a) |
| Grid style | CSS masonry (columns) — Pinterest-style staggered heights |
| Radius | 16px rounded corners throughout |

## Color Palette (Preserved)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#f7f5f2` | Page background |
| `--surface` | `#ffffff` | Cards, panels |
| `--text` | `#1a1a1a` | Primary text |
| `--text-secondary` | `#444444` | Secondary text |
| `--text-muted` | `#999999` | Muted text |
| `--border` | `#eeeeee` | Borders |
| `--accent-sale` | `#e85d3a` | Sale badges |
| `--accent-free` | `#2d8a4e` | Free badges |
| `--dark` | `#1a1a1a` | Dark surfaces, primary buttons |

## Typography (Preserved)

- Primary: `"Pretendard", "Inter", "Noto Sans KR", sans-serif`
- Titles: Same family, weight 800, tight letter-spacing

## Component Designs

### 1. Pin Card (Novel Card)

```
┌─────────────────┐
│                  │
│   Cover Image    │  ← Variable height (aspect ratio varies)
│   (image-first)  │
│                  │
│  ┌────────────┐  │  ← Hover: slide-up overlay
│  │ ★ 4.2      │  │     - Rating
│  │ 다크판타지  │  │     - Genre tag
│  │ 3화 무료   │  │     - Free episode count
│  │ 편당 300원  │  │     - Price info
│  └────────────┘  │
├─────────────────┤
│ Title            │  ← Always visible below image
│ Author           │
└─────────────────┘
```

- Border-radius: 16px
- Box-shadow: `0 1px 4px rgba(0,0,0,0.06)`
- Hover: `0 8px 24px rgba(0,0,0,0.12)` + overlay slide-up
- Sale badge: top-right corner persistent

### 2. Masonry Grid

```
┌──┐ ┌────┐ ┌──┐ ┌───┐ ┌──┐
│  │ │    │ │  │ │   │ │  │
│  │ │    │ └──┘ │   │ │  │
│  │ └────┘ ┌──┐ │   │ └──┘
└──┘ ┌──┐   │  │ └───┘ ┌──┐
┌──┐ │  │   │  │ ┌───┐ │  │
│  │ │  │   └──┘ │   │ │  │
│  │ └──┘ ┌────┐ │   │ └──┘
└──┘      │    │ └───┘
          └────┘
```

- CSS `columns: 5` for desktop, responsive breakpoints
- `column-gap: 16px`
- Cards with `break-inside: avoid`

### 3. Slim Promo Banner

```
┌─────────────────────────────────────────────────┐
│ 🔥 이번 주 장르전 · 최대 45% 할인 · 2일 남음   │  [전체 보기 →]
└─────────────────────────────────────────────────┘
```

- Single row, compact height (~56px)
- Left: sale badge + event title + countdown
- Right: CTA link
- Background: subtle gradient or `--surface`

### 4. Search Page

- Top: search bar (full width, prominent)  
- Below: horizontal filter chips (scrollable)
- Main: masonry grid results
- No sidebar — filters are inline

### 5. Detail Page (Pin-Detail Style)

```
┌──────────────────────────────┐
│  ┌────────┐  ┌────────────┐ │
│  │        │  │ Title      │ │
│  │ Cover  │  │ Author     │ │
│  │ Image  │  │ Meta       │ │
│  │        │  │ Synopsis   │ │
│  │        │  │ [읽기] Buy │ │
│  └────────┘  │ Episodes   │ │
│              └────────────┘ │
└──────────────────────────────┘
        ↓ 추천 작품 (masonry grid)
```

- Centered card with max-width
- Left: large cover, Right: all info
- Below: "More like this" masonry grid

### 6. Library (Collection Board)

- Board-style groups (읽는 중, 위시리스트, 완독)
- Each group: masonry grid of pin cards
- Pinterest board headers

## Transitions & Animations

| Element | Animation | Duration |
|---------|----------|----------|
| Card hover | translateY(-4px) + shadow | 200ms ease |
| Overlay slide-up | translateY(100%) → 0 | 300ms ease |
| Badge appear | opacity 0→1 | 200ms ease |
| Page load cards | staggered fadeInUp | 60ms delay each |

## Responsive Breakpoints

| Width | Columns | Behavior |
|-------|---------|----------|
| ≥1440px | 5 columns | Full desktop |
| ≥1080px | 4 columns | Standard desktop |
| ≥768px | 3 columns | Tablet |
| ≥480px | 2 columns | Large mobile |
| <480px | 2 columns | Mobile |
