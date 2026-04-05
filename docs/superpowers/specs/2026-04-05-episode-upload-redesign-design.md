# Episode Upload PC Redesign Design Spec

## Goal
Redesign `episode_upload_pc.html` to match the "Clean Light Store" aesthetic and the standard creator layout used in other creator-facing pages (like `novel_upload_pc.html` and `creator_dashboard_pc.html`).

## Architecture & Layout

The page will be migrated from a topbar-centric layout to a full-screen, 3-column-like creator layout.

### 1. Global Structure
- **Root Element:** `<body class="pc-desktop store-light">`
- **Main Container:** `<div class="creator-layout">`
- **Sidebar (`creator-sidebar`):** The standard left-side global navigation bar, identical to the one in `novel_upload_pc.html`. Contains links to "My Works", "Statistics", "Upload Novel", and "Upload Episode".

### 2. Main Workspace (`creator-main`)
The area to the right of the global sidebar will be divided into a flexible editor area and a fixed right panel.

#### 2.1 Editor Area (Left, ~70% width)
- **Header:** Page title ("새 회차 발행") and the "Publish" button (`data-upload-submit`).
- **Form Grid:**
  - **Row 1:** Novel selection dropdown (`data-episode-novel`) and Access type dropdown (Free/Paid, `data-episode-access`).
  - **Row 2:** Episode title input (`data-episode-title`) and Episode price input (`data-episode-price`).
- **Editor:** The Toast UI Editor container. It will take up the remaining flexible space, providing a wide and distraction-free writing environment.

#### 2.2 Right Panel Area (`episode-aside`, fixed width ~320px)
This panel replaces the old left-side `episode-aside` and will feature a tabbed interface to save space and reduce scrolling.

- **Tabs:** Two tabs at the top:
  - **"설정 및 정보" (Settings & Info):** The default active tab.
  - **"회차 목록" (Episode List):** Shows previous episodes.
- **Tab Content 1: Settings & Info**
  - **Selected Work Card (`episode-work-card`):** Shows the selected novel's thumbnail, title, tags, and summary.
  - **Guide/Helper Text:** Instructions about free vs. paid episodes.
- **Tab Content 2: Episode List**
  - **Episode Index Shell (`episode-index-shell`):** The existing episode list, including filters (All, Published, Hidden, Trashed) and the list of previous episodes (`episode-index-list`).

## Data Flow & State Management
- **No changes to existing JS logic.** The HTML structure will be modified, but all `data-*` attributes (`data-episode-novel`, `data-episode-title`, `data-episode-index-list`, etc.) required by `assets/episode-upload.js` and `assets/app.js` will be preserved exactly as they are.
- CSS classes will be updated to use the `.store-light` and `.creator-layout` utility classes defined in `pc.css` and `styles.css`.
- Tab switching logic (between Info and List) will be implemented using simple vanilla JS within the HTML file, or by adding a small handler, ensuring it doesn't interfere with the main episode logic.

## Error Handling & Edge Cases
- **Mobile View:** The creator dashboard and upload pages are currently PC-only (`pc-desktop`). If accessed on a narrower screen, the right panel will stack below the editor area, similar to standard responsive grid behavior defined in `pc.css`.
- **Missing Data:** If no novel is selected, the right panel's Info tab will show the default placeholder state.

## Testing Strategy
- Manual visual verification of the layout in the browser.
- Verify that selecting a novel correctly updates the Info tab and the Episode List tab.
- Verify that the Toast UI Editor instantiates correctly within the new flexible container.
- Verify that publishing an episode still works (data attributes are correctly hooked up).