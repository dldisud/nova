# InkRoad Creator Edit and Sale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing creator upload pages to support novel editing, episode editing, and simple per-work sale registration with author-only permissions.

**Architecture:** Keep the current page structure and add `edit` modes to the two upload flows instead of creating parallel admin pages. Put all write access behind new Supabase RPC functions so ownership checks, tag rewrites, and sale calculations stay in one place. Extend the creator dashboard with action links and a small inline sale form that writes through the RPC and then refreshes the same dashboard data already used by the storefront.

**Tech Stack:** Static HTML, vanilla JavaScript, Supabase Auth, Supabase RPC via Postgres functions, existing InkRoad CSS, Python `unittest` string-contract tests.

---

## File Map

- Modify: `/mnt/d/nova/supabase/schema.sql`
  - Add three writer RPC functions for novel update, episode update, and sale upsert.
- Modify: `/mnt/d/nova/assets/upload-studio.js`
  - Add `create` / `edit` mode switching, novel preload, and update submit flow.
- Modify: `/mnt/d/nova/assets/episode-upload.js`
  - Add `create` / `edit` mode switching, episode preload, locked work selection, and update submit flow.
- Modify: `/mnt/d/nova/assets/creator-dashboard.js`
  - Add edit links, latest-episode edit link, sale panel state, sale save flow, and refresh.
- Modify: `/mnt/d/nova/novel_upload_pc.html`
  - Add mode-aware heading hooks and containers that can hide the first-episode section in edit mode.
- Modify: `/mnt/d/nova/episode_upload_pc.html`
  - Add mode-aware heading hooks and read-only episode metadata display for edit mode.
- Modify: `/mnt/d/nova/creator_dashboard_pc.html`
  - Add sale panel markup and action hooks for edit buttons.
- Modify: `/mnt/d/nova/assets/pc.css`
  - Add minimal styles for sale panel, read-only metadata, and disabled selection states.
- Create: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`
  - Add regression tests that lock the new RPC names and front-end hooks into place.

---

### Task 1: Lock The New DB Contract

**Files:**
- Modify: `/mnt/d/nova/supabase/schema.sql`
- Create: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`
- Test: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`

- [ ] **Step 1: Write the failing test for the three creator RPCs**

```python
from pathlib import Path
import unittest

ROOT = Path('/mnt/d/nova')


class CreatorEditSaleFlowTests(unittest.TestCase):
    def test_schema_defines_creator_update_rpcs(self):
        schema = (ROOT / 'supabase' / 'schema.sql').read_text(encoding='utf-8')
        self.assertIn('create or replace function public.update_novel_for_author', schema)
        self.assertIn('create or replace function public.update_episode_for_author', schema)
        self.assertIn('create or replace function public.upsert_novel_sale_for_author', schema)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_schema_defines_creator_update_rpcs -v`
Expected: `FAIL` because the RPC names do not exist in `/mnt/d/nova/supabase/schema.sql` yet.

- [ ] **Step 3: Add `update_novel_for_author` to the schema**

```sql
create or replace function public.update_novel_for_author(
  p_novel_id uuid,
  p_title text,
  p_short_description text,
  p_description text,
  p_age_rating smallint,
  p_is_translation boolean,
  p_origin_country text,
  p_cover_url text,
  p_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_author_id uuid;
  novel_row public.novels%rowtype;
  clean_title text := trim(coalesce(p_title, ''));
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id into current_author_id
  from public.authors
  where user_id = current_user_id;

  if current_author_id is null then
    raise exception '작가 정보가 없습니다.';
  end if;

  select * into novel_row
  from public.novels
  where id = p_novel_id;

  if not found then
    raise exception '작품을 찾을 수 없습니다.';
  end if;

  if novel_row.author_id <> current_author_id then
    raise exception '이 작품은 수정 권한이 없습니다.';
  end if;

  if clean_title = '' then
    raise exception '제목을 먼저 입력해주세요.';
  end if;

  update public.novels
  set
    title = clean_title,
    short_description = nullif(trim(coalesce(p_short_description, '')), ''),
    description = coalesce(nullif(trim(coalesce(p_description, '')), ''), clean_title),
    age_rating = coalesce(p_age_rating, age_rating),
    is_translation = coalesce(p_is_translation, is_translation),
    origin_country = upper(left(coalesce(nullif(trim(coalesce(p_origin_country, '')), ''), origin_country, 'KR'), 2)),
    cover_url = coalesce(nullif(trim(coalesce(p_cover_url, '')), ''), cover_url),
    updated_at = timezone('utc', now())
  where id = p_novel_id;

  delete from public.novel_tags where novel_id = p_novel_id;
  insert into public.novel_tags (novel_id, tag_id)
  select p_novel_id, t.id
  from public.tags t
  where t.name = any(coalesce(p_tags, array[]::text[]));

  return jsonb_build_object('novel_id', p_novel_id, 'novel_slug', novel_row.slug, 'updated_at', timezone('utc', now()));
end;
$$;
```

- [ ] **Step 4: Add `update_episode_for_author` and `upsert_novel_sale_for_author` to the schema**

```sql
create or replace function public.update_episode_for_author(
  p_episode_id uuid,
  p_title text,
  p_body text,
  p_access_type public.episode_access_type,
  p_price numeric(10,2)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_author_id uuid;
  episode_row public.episodes%rowtype;
  novel_row public.novels%rowtype;
  clean_title text := trim(coalesce(p_title, ''));
  clean_body text := trim(coalesce(p_body, ''));
  next_price numeric(10,2);
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id into current_author_id
  from public.authors
  where user_id = current_user_id;

  select e.*, n.* into episode_row, novel_row
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  where e.id = p_episode_id;

  if not found then
    raise exception '회차를 찾을 수 없습니다.';
  end if;

  if novel_row.author_id <> current_author_id then
    raise exception '이 회차는 수정 권한이 없습니다.';
  end if;

  if clean_title = '' then
    raise exception '회차 제목을 먼저 입력해주세요.';
  end if;

  if clean_body = '' then
    raise exception '본문을 먼저 입력해주세요.';
  end if;

  if p_access_type = 'paid' then
    next_price := coalesce(p_price, 0);
    if next_price <= 0 then
      raise exception '유료 회차 가격을 입력해주세요.';
    end if;
  else
    next_price := 0;
  end if;

  update public.episodes
  set
    title = clean_title,
    access_type = coalesce(p_access_type, access_type),
    price = case when coalesce(p_access_type, access_type) = 'paid' then next_price else 0 end,
    updated_at = timezone('utc', now())
  where id = p_episode_id;

  update public.episode_contents
  set
    body = clean_body,
    updated_at = timezone('utc', now())
  where episode_id = p_episode_id;

  return jsonb_build_object(
    'episode_id', p_episode_id,
    'novel_slug', novel_row.slug,
    'episode_number', episode_row.episode_number,
    'updated_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.upsert_novel_sale_for_author(
  p_novel_id uuid,
  p_discount_percent integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_author_id uuid;
  novel_row public.novels%rowtype;
  sale_price numeric(10,2);
  event_id_value uuid;
  event_slug_value text;
  event_status_value public.event_status;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_discount_percent is null or p_discount_percent <= 0 or p_discount_percent > 90 then
    raise exception '할인율을 확인해주세요.';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception '할인 종료일은 시작일보다 뒤여야 합니다.';
  end if;

  select id into current_author_id
  from public.authors
  where user_id = current_user_id;

  select * into novel_row
  from public.novels
  where id = p_novel_id;

  if not found then
    raise exception '작품을 찾을 수 없습니다.';
  end if;

  if novel_row.author_id <> current_author_id then
    raise exception '이 작품은 수정 권한이 없습니다.';
  end if;

  sale_price := greatest(100, round((300 * (100 - p_discount_percent)) / 100.0));
  event_slug_value := novel_row.slug || '-bundle-sale';
  event_status_value := case when p_starts_at <= timezone('utc', now()) then 'active' else 'scheduled' end;

  update public.novels
  set
    bundle_list_price = coalesce(bundle_list_price, 300),
    bundle_sale_price = sale_price,
    sale_starts_at = p_starts_at,
    sale_ends_at = p_ends_at,
    updated_at = timezone('utc', now())
  where id = p_novel_id;

  insert into public.events (slug, title, subtitle, description, event_type, status, starts_at, ends_at)
  values (
    event_slug_value,
    novel_row.title || ' 할인전',
    '크리에이터 직접 등록',
    '작가가 직접 등록한 단일 작품 할인 이벤트입니다.',
    'bundle_sale',
    event_status_value,
    p_starts_at,
    p_ends_at
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = timezone('utc', now())
  returning id into event_id_value;

  insert into public.event_items (event_id, novel_id, sort_order, discount_percent, sale_price)
  values (event_id_value, p_novel_id, 1, p_discount_percent, sale_price)
  on conflict (event_id, novel_id) do update
  set
    discount_percent = excluded.discount_percent,
    sale_price = excluded.sale_price,
    sort_order = excluded.sort_order;

  return jsonb_build_object(
    'novel_id', p_novel_id,
    'discount_percent', p_discount_percent,
    'sale_price', sale_price,
    'event_id', event_id_value,
    'event_slug', event_slug_value
  );
end;
$$;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_schema_defines_creator_update_rpcs -v`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add /mnt/d/nova/supabase/schema.sql /mnt/d/nova/tests/test_creator_edit_sale_flow.py
git commit -m "feat: add creator update and sale rpc functions"
```

### Task 2: Add Novel Edit Mode To The Existing Upload Page

**Files:**
- Modify: `/mnt/d/nova/novel_upload_pc.html`
- Modify: `/mnt/d/nova/assets/upload-studio.js`
- Modify: `/mnt/d/nova/assets/pc.css`
- Test: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`

- [ ] **Step 1: Write the failing UI contract tests for novel edit mode**

```python
    def test_upload_studio_has_edit_mode_hooks(self):
        html = (ROOT / 'novel_upload_pc.html').read_text(encoding='utf-8')
        script = (ROOT / 'assets' / 'upload-studio.js').read_text(encoding='utf-8')
        self.assertIn('data-upload-mode-title', html)
        self.assertIn('data-upload-episode-section', html)
        self.assertIn('update_novel_for_author', script)
        self.assertIn('editingNovelId', script)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_upload_studio_has_edit_mode_hooks -v`
Expected: `FAIL` because the new mode hooks and RPC call do not exist yet.

- [ ] **Step 3: Add mode-aware markup to the upload page**

```html
<h1 class="studio-title" data-upload-mode-title>새 작품 등록</h1>
<p class="studio-copy" data-upload-mode-copy>첫 회차와 함께 작품을 등록합니다.</p>

<section class="studio-episode-section" data-upload-episode-section>
  <div class="form-group">
    <label class="form-label" for="episode-title">첫 회차 제목<span>*</span></label>
    <input id="episode-title" class="form-input" data-upload-episode-title>
  </div>
</section>
```

- [ ] **Step 4: Add minimal edit-mode logic to `upload-studio.js`**

```javascript
  const query = new URLSearchParams(window.location.search);
  const state = {
    client: null,
    session: null,
    busy: false,
    previewMode: false,
    coverFile: null,
    coverObjectUrl: '',
    tagMap: new Map(),
    mode: query.get('edit') ? 'edit' : 'create',
    editingNovelId: query.get('edit') || '',
    existingCoverUrl: '',
    loadedNovel: null
  };

  async function loadNovelForEdit() {
    if (state.mode !== 'edit' || !state.editingNovelId) return;
    const novelResult = await state.client
      .from('novels')
      .select('id,title,short_description,description,cover_url,age_rating,is_translation,origin_country,author_id')
      .eq('id', state.editingNovelId)
      .maybeSingle();
    if (novelResult.error || !novelResult.data) throw new Error('수정할 작품을 찾을 수 없습니다.');

    const authorResult = await state.client
      .from('authors')
      .select('id')
      .eq('user_id', state.session.user.id)
      .maybeSingle();
    if (!authorResult.data || authorResult.data.id !== novelResult.data.author_id) {
      throw new Error('이 작품은 수정 권한이 없습니다.');
    }

    state.loadedNovel = novelResult.data;
    state.existingCoverUrl = novelResult.data.cover_url || '';
    refs.title.value = novelResult.data.title || '';
    refs.summary.value = novelResult.data.short_description || novelResult.data.description || '';
    refs.ageRating.value = String(novelResult.data.age_rating || 15);
    refs.originCountry.value = novelResult.data.origin_country || 'KR';
    refs.isTranslation.checked = Boolean(novelResult.data.is_translation);
    if (refs.coverDropzone && state.existingCoverUrl) {
      refs.coverDropzone.dataset.hasImage = 'true';
      refs.coverPreview.hidden = false;
      refs.coverPreview.src = state.existingCoverUrl;
      refs.coverPlaceholder.hidden = true;
    }
  }
```

- [ ] **Step 5: Switch submit handling between create and edit**

```javascript
  async function handleSubmit(event) {
    event.preventDefault();
    if (state.mode === 'edit') {
      const coverUrl = state.coverFile ? await uploadCover(state.session) : state.existingCoverUrl || null;
      const result = await state.client.rpc('update_novel_for_author', {
        p_novel_id: state.editingNovelId,
        p_title: refs.title.value.trim(),
        p_short_description: refs.summary.value.trim() || null,
        p_description: refs.summary.value.trim() || null,
        p_age_rating: Number(refs.ageRating.value || 15),
        p_is_translation: Boolean(refs.isTranslation.checked),
        p_origin_country: refs.originCountry.value.trim().toUpperCase().slice(0, 2) || 'KR',
        p_cover_url: coverUrl,
        p_tags: getSelectedTags()
      });
      if (result.error) throw result.error;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      window.location.href = 'novel_detail_pc.html?slug=' + encodeURIComponent(row.novel_slug);
      return;
    }

    return handleCreatePublish(event);
  }
```

- [ ] **Step 6: Run the novel edit contract test**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_upload_studio_has_edit_mode_hooks -v`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add /mnt/d/nova/novel_upload_pc.html /mnt/d/nova/assets/upload-studio.js /mnt/d/nova/assets/pc.css /mnt/d/nova/tests/test_creator_edit_sale_flow.py
git commit -m "feat: support novel edit mode in upload studio"
```

### Task 3: Add Episode Edit Mode To The Existing Episode Editor

**Files:**
- Modify: `/mnt/d/nova/episode_upload_pc.html`
- Modify: `/mnt/d/nova/assets/episode-upload.js`
- Modify: `/mnt/d/nova/assets/pc.css`
- Test: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`

- [ ] **Step 1: Write the failing UI contract tests for episode edit mode**

```python
    def test_episode_editor_has_edit_mode_hooks(self):
        html = (ROOT / 'episode_upload_pc.html').read_text(encoding='utf-8')
        script = (ROOT / 'assets' / 'episode-upload.js').read_text(encoding='utf-8')
        self.assertIn('data-episode-mode-title', html)
        self.assertIn('data-episode-readonly-meta', html)
        self.assertIn('update_episode_for_author', script)
        self.assertIn('editingEpisodeId', script)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_episode_editor_has_edit_mode_hooks -v`
Expected: `FAIL`

- [ ] **Step 3: Add mode-aware episode editor markup**

```html
<h1 class="page-title" data-episode-mode-title>회차 추가</h1>
<p class="episode-helper" data-episode-mode-copy>내가 올린 작품에 새 회차를 발행합니다.</p>
<div class="episode-readonly-meta" data-episode-readonly-meta hidden></div>
```

- [ ] **Step 4: Add edit-mode preload and locked-work logic**

```javascript
  var state = {
    client: null,
    session: null,
    authorId: null,
    works: [],
    selectedSlug: query.get('slug') || '',
    busy: false,
    editor: null,
    editorMode: 'wysiwyg',
    lastSavedBody: '',
    debounceTimer: null,
    intervalTimer: null,
    snapshots: [],
    mode: query.get('edit') ? 'edit' : 'create',
    editingEpisodeId: query.get('edit') || '',
    loadedEpisode: null,
    lockedNovelSlug: ''
  };

  async function loadEpisodeForEdit() {
    if (state.mode !== 'edit' || !state.editingEpisodeId) return;
    var result = await state.client
      .from('episodes')
      .select('id,novel_id,episode_number,title,access_type,price,novels!inner(id,slug,title,author_id),episode_contents(body)')
      .eq('id', state.editingEpisodeId)
      .maybeSingle();
    if (result.error || !result.data) throw new Error('수정할 회차를 찾을 수 없습니다.');

    var authorResult = await state.client.from('authors').select('id').eq('user_id', state.session.user.id).maybeSingle();
    var novel = Array.isArray(result.data.novels) ? result.data.novels[0] : result.data.novels;
    if (!authorResult.data || novel.author_id !== authorResult.data.id) {
      throw new Error('이 회차는 수정 권한이 없습니다.');
    }

    state.loadedEpisode = result.data;
    state.lockedNovelSlug = novel.slug;
    state.selectedSlug = novel.slug;
    refs.titleInput.value = result.data.title || '';
    refs.accessSelect.value = result.data.access_type || 'free';
    refs.priceInput.value = String(result.data.price || 100);
    setEditorContent((Array.isArray(result.data.episode_contents) ? result.data.episode_contents[0] : result.data.episode_contents).body || '');
    refs.novelSelect.disabled = true;
    refs.novelSelect.value = novel.slug;
  }
```

- [ ] **Step 5: Route submit through `update_episode_for_author` in edit mode**

```javascript
    if (state.mode === 'edit') {
      var updateResult = await state.client.rpc('update_episode_for_author', {
        p_episode_id: state.editingEpisodeId,
        p_title: title,
        p_body: body,
        p_access_type: accessType,
        p_price: accessType === 'paid' ? price : 0
      });
      if (updateResult.error) throw updateResult.error;
      var updated = Array.isArray(updateResult.data) ? updateResult.data[0] : updateResult.data;
      window.location.href = viewerHref(updated.novel_slug, updated.episode_number);
      return;
    }
```

- [ ] **Step 6: Run the episode edit contract test**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_episode_editor_has_edit_mode_hooks -v`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add /mnt/d/nova/episode_upload_pc.html /mnt/d/nova/assets/episode-upload.js /mnt/d/nova/assets/pc.css /mnt/d/nova/tests/test_creator_edit_sale_flow.py
git commit -m "feat: support episode edit mode in creator editor"
```

### Task 4: Add Dashboard Action Links And Sale Panel

**Files:**
- Modify: `/mnt/d/nova/creator_dashboard_pc.html`
- Modify: `/mnt/d/nova/assets/creator-dashboard.js`
- Modify: `/mnt/d/nova/assets/pc.css`
- Test: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`

- [ ] **Step 1: Write the failing dashboard contract tests**

```python
    def test_creator_dashboard_exposes_edit_and_sale_actions(self):
        html = (ROOT / 'creator_dashboard_pc.html').read_text(encoding='utf-8')
        script = (ROOT / 'assets' / 'creator-dashboard.js').read_text(encoding='utf-8')
        self.assertIn('data-sale-panel', html)
        self.assertIn('작품 수정', script)
        self.assertIn('최근 회차 수정', script)
        self.assertIn('upsert_novel_sale_for_author', script)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_creator_dashboard_exposes_edit_and_sale_actions -v`
Expected: `FAIL`

- [ ] **Step 3: Add sale panel markup to the dashboard page**

```html
<section class="creator-sale-panel" data-sale-panel hidden>
  <div class="creator-sale-panel-head">
    <h2 data-sale-title>할인 등록</h2>
    <button class="button ghost" type="button" data-sale-close>닫기</button>
  </div>
  <form class="creator-sale-form" data-sale-form>
    <label class="creator-field">
      <span>작품명</span>
      <input type="text" data-sale-work-title readonly>
    </label>
    <label class="creator-field">
      <span>할인율</span>
      <select data-sale-discount>
        <option value="5">5%</option>
        <option value="10">10%</option>
        <option value="15">15%</option>
        <option value="20">20%</option>
        <option value="30">30%</option>
        <option value="40">40%</option>
        <option value="50">50%</option>
      </select>
    </label>
    <label class="creator-field"><span>시작일</span><input type="datetime-local" data-sale-start required></label>
    <label class="creator-field"><span>종료일</span><input type="datetime-local" data-sale-end required></label>
    <p class="creator-sale-preview" data-sale-preview>편당 300원 -> 편당 285원</p>
    <button class="button primary" type="submit">할인 저장</button>
    <p class="creator-sale-status" data-sale-status hidden></p>
  </form>
</section>
```

- [ ] **Step 4: Add dashboard helpers and action rendering**

```javascript
  function novelEditHref(work) {
    return 'novel_upload_pc.html?edit=' + encodeURIComponent(work.id);
  }

  function episodeEditHref(work) {
    if (!work.latestEpisode || !work.latestEpisode.id) return '';
    return 'episode_upload_pc.html?edit=' + encodeURIComponent(work.latestEpisode.id);
  }

  function discountPreview(percent) {
    var sale = Math.max(100, Math.round((300 * (100 - Number(percent || 0))) / 100));
    return '편당 300원 -> 편당 ' + formatCount(sale) + '원';
  }
```

```javascript
      return "<article class='creator-work-card'>" +
        "..." +
        "<div class='button-row creator-action-row'>" +
          "<a class='button small ghost' href='" + novelEditHref(work) + "'>작품 수정</a>" +
          (episodeEditHref(work) ? "<a class='button small ghost' href='" + episodeEditHref(work) + "'>최근 회차 수정</a>" : "") +
          "<button class='button small secondary' type='button' data-sale-open='" + esc(work.id) + "'>할인 등록</button>" +
          "<a class='button small secondary' href='" + episodeUploadHref(work.slug) + "'>새 회차</a>" +
          "<a class='button small primary' href='" + detailHref(work.slug) + "'>상세 보기</a>" +
        "</div>" +
      "</article>";
```

- [ ] **Step 5: Add sale panel state, preload, save, and refresh logic**

```javascript
  state.salePanelOpen = false;
  state.saleTargetNovelId = '';
  state.activeSaleByNovelId = new Map();

  async function saveSale(event) {
    event.preventDefault();
    var result = await state.client.rpc('upsert_novel_sale_for_author', {
      p_novel_id: state.saleTargetNovelId,
      p_discount_percent: Number(refs.saleDiscount.value),
      p_starts_at: new Date(refs.saleStart.value).toISOString(),
      p_ends_at: new Date(refs.saleEnd.value).toISOString()
    });
    if (result.error) throw result.error;
    await renderDashboard(state.session);
    closeSalePanel('할인 일정이 저장되었습니다.', 'success');
  }
```

- [ ] **Step 6: Run the dashboard contract test**

Run: `python3 -m unittest tests.test_creator_edit_sale_flow.CreatorEditSaleFlowTests.test_creator_dashboard_exposes_edit_and_sale_actions -v`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add /mnt/d/nova/creator_dashboard_pc.html /mnt/d/nova/assets/creator-dashboard.js /mnt/d/nova/assets/pc.css /mnt/d/nova/tests/test_creator_edit_sale_flow.py
git commit -m "feat: add creator edit links and sale panel"
```

### Task 5: Verify End-To-End Wiring And Storefront Impact

**Files:**
- Modify: `/mnt/d/nova/tests/test_creator_edit_sale_flow.py`
- Verify: `/mnt/d/nova/assets/store-redesign.js`
- Verify: `/mnt/d/nova/assets/upload-studio.js`
- Verify: `/mnt/d/nova/assets/episode-upload.js`
- Verify: `/mnt/d/nova/assets/creator-dashboard.js`

- [ ] **Step 1: Add final integration string tests**

```python
    def test_creator_sale_flow_refreshes_store_fields(self):
        schema = (ROOT / 'supabase' / 'schema.sql').read_text(encoding='utf-8')
        dashboard = (ROOT / 'assets' / 'creator-dashboard.js').read_text(encoding='utf-8')
        self.assertIn('bundle_sale_price', schema)
        self.assertIn('event_items', schema)
        self.assertIn('upsert_novel_sale_for_author', dashboard)

    def test_edit_modes_redirect_back_to_existing_reader_routes(self):
        upload = (ROOT / 'assets' / 'upload-studio.js').read_text(encoding='utf-8')
        episode = (ROOT / 'assets' / 'episode-upload.js').read_text(encoding='utf-8')
        self.assertIn('novel_detail_pc.html?slug=', upload)
        self.assertIn('viewerHref', episode)
        self.assertIn('update_episode_for_author', episode)
```

- [ ] **Step 2: Run the full regression file**

Run: `python3 -m unittest tests/test_creator_edit_sale_flow.py -v`
Expected: all creator edit and sale tests pass with `OK`.

- [ ] **Step 3: Run the existing purchase regression file to catch accidental breakage**

Run: `python3 -m unittest tests/test_episode_purchase_flow.py -v`
Expected: `OK`

- [ ] **Step 4: Perform manual browser checks**

Run these pages in a browser after applying the SQL changes in Supabase:
- `novel_upload_pc.html?edit=<owned_novel_id>`
- `episode_upload_pc.html?edit=<owned_episode_id>`
- `creator_dashboard_pc.html`
- `homepage_pc.html`
- `novel_detail_pc.html?slug=<edited_slug>`

Expected:
- owned novel data preloads in the upload form
- first-episode section is hidden in novel edit mode
- owned episode data preloads in the episode editor
- dashboard shows `작품 수정`, `최근 회차 수정`, `할인 등록`
- saving a sale updates the dashboard, sale price, and storefront sale rendering

- [ ] **Step 5: Commit**

```bash
git add /mnt/d/nova/tests/test_creator_edit_sale_flow.py
git commit -m "test: cover creator edit and sale flow"
```

---

## Self-Review

### Spec coverage
- 작품 수정: Task 2 covers page hooks, preload, update RPC call, redirect.
- 회차 수정: Task 3 covers page hooks, preload, locked work selection, update RPC call, redirect.
- 할인 등록: Task 4 covers dashboard actions, panel, preview, RPC save, dashboard refresh.
- DB 권한 경계: Task 1 keeps writes behind RPCs only.
- 홈/상세 반영: Task 5 verifies sale data lands in the same schema fields the storefront already reads.

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” text remains.
- Every task includes exact file paths, commands, and concrete code snippets.

### Type consistency
- RPC names are consistent across the schema and all JS tasks: `update_novel_for_author`, `update_episode_for_author`, `upsert_novel_sale_for_author`.
- Edit mode state names are consistent: `editingNovelId`, `editingEpisodeId`, `saleTargetNovelId`.
- Redirects stay on existing routes: `novel_detail_pc.html` and `novel_viewer_pc.html`.
