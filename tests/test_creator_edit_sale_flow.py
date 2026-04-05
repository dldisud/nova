from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class CreatorEditSaleFlowTests(unittest.TestCase):
    def _schema(self) -> str:
        return (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8")

    def _upload_html(self) -> str:
        return (ROOT / "novel_upload_pc.html").read_text(encoding="utf-8")

    def _upload_js(self) -> str:
        return (ROOT / "assets" / "upload-studio.js").read_text(encoding="utf-8")

    def _episode_upload_html(self) -> str:
        return (ROOT / "episode_upload_pc.html").read_text(encoding="utf-8")

    def _episode_upload_js(self) -> str:
        return (ROOT / "assets" / "episode-upload.js").read_text(encoding="utf-8")

    def _creator_dashboard_html(self) -> str:
        return (ROOT / "creator_dashboard_pc.html").read_text(encoding="utf-8")

    def _creator_dashboard_js(self) -> str:
        return (ROOT / "assets" / "creator-dashboard.js").read_text(encoding="utf-8")

    def _store_redesign_js(self) -> str:
        return (ROOT / "assets" / "store-redesign.js").read_text(encoding="utf-8")

    def _function_block(self, fn_name: str) -> str:
        schema = self._schema()
        start = schema.index(f"create or replace function public.{fn_name}")
        tail = schema[start:]
        end = tail.find("\n$$;")
        self.assertNotEqual(end, -1, f"function body not closed: {fn_name}")
        return tail[: end + len("\n$$;")]

    def test_schema_defines_creator_rpcs(self):
        schema = self._schema()
        self.assertIn("create or replace function public.update_novel_for_author", schema)
        self.assertIn("create or replace function public.update_episode_for_author", schema)
        self.assertIn("create or replace function public.upsert_novel_sale_for_author", schema)

    def test_schema_has_owner_scoped_edit_preload_helper(self):
        schema = self._schema()
        self.assertIn("create or replace function public.get_owned_novel_edit_payload_for_author", schema)
        block = self._function_block("get_owned_novel_edit_payload_for_author(")
        self.assertIn("security definer", block)
        self.assertIn("auth.uid()", block)
        self.assertIn("select n.*", block)
        self.assertIn("select a.user_id", block)
        self.assertNotIn("into novel_row, owner_user_id", block)
        self.assertIn("owner_user_id is null or owner_user_id <> current_user_id", block)
        self.assertIn("raise exception '본인 작품만 수정할 수 있습니다.'", block)
        self.assertIn("'tags', coalesce(tag_names, '{}'::text[])", block)

    def test_schema_has_owner_scoped_episode_edit_preload_helper(self):
        schema = self._schema()
        self.assertIn("create or replace function public.get_owned_episode_edit_payload_for_author", schema)
        block = self._function_block("get_owned_episode_edit_payload_for_author(")
        self.assertIn("security definer", block)
        self.assertIn("auth.uid()", block)
        self.assertIn("a.user_id = current_user_id", block)
        self.assertIn("raise exception '본인 회차만 수정할 수 있습니다.'", block)
        self.assertIn("'episode_id', e.id", block)
        self.assertIn("'novel_slug', n.slug", block)
        self.assertIn("'episode_number', e.episode_number", block)
        self.assertIn("'body', ec.body", block)

    def test_authors_user_id_column_and_index_exist(self):
        schema = self._schema()
        self.assertIn("add column if not exists user_id uuid references auth.users(id)", schema)
        self.assertIn("create unique index if not exists authors_user_id_uidx on public.authors(user_id)", schema)

    def test_runtime_rpcs_use_user_id_without_mutation(self):
        for fn_name in (
            "update_novel_for_author(",
            "update_episode_for_author(",
            "upsert_novel_sale_for_author(",
        ):
            block = self._function_block(fn_name)
            self.assertIn("a.user_id = current_user_id", block)
            self.assertNotIn("update public.authors", block)
            self.assertNotIn("set user_id =", block)
            self.assertNotIn("display_name", block)
            self.assertNotIn("pen_name", block)

    def test_admin_migration_support_helper_exists(self):
        schema = self._schema()
        self.assertIn("create or replace function public.link_author_user_for_admin", schema)
        block = self._function_block("link_author_user_for_admin(")
        self.assertIn("security definer", block)
        self.assertIn("auth.uid()", block)
        self.assertIn("role = 'admin'", block)
        self.assertIn("update public.authors", block)
        self.assertIn("set user_id = p_user_id", block)
        self.assertIn("for update", block)
        self.assertIn("current_linked_user_id is not null and current_linked_user_id <> p_user_id", block)
        self.assertIn("raise exception '이미 다른 계정에 연결된 작가입니다.'", block)
        self.assertIn("and (user_id is null or user_id = p_user_id)", block)

    def test_update_novel_contract_markers(self):
        schema = self._schema()
        self.assertIn("p_tags text[]", schema)
        self.assertIn("if p_tags is not null then", schema)
        self.assertIn("subtitle = coalesce(p_subtitle, subtitle)", schema)
        self.assertIn("short_description = coalesce(p_short_description, short_description)", schema)
        self.assertIn("cover_url = coalesce(p_cover_url, cover_url)", schema)
        self.assertIn("banner_url = coalesce(p_banner_url, banner_url)", schema)
        self.assertIn("origin_country = coalesce(p_origin_country, origin_country)", schema)
        self.assertIn("'novel_slug', updated_novel_slug", schema)
        self.assertIn("'updated_at', updated_novel_at", schema)

    def test_update_episode_return_markers(self):
        schema = self._schema()
        self.assertIn("'episode_id', p_episode_id", schema)
        self.assertIn("'novel_slug', episode_novel_slug", schema)
        self.assertIn("'episode_number', episode_row.episode_number", schema)
        self.assertIn("'updated_at', episode_updated_at", schema)

    def test_sale_window_and_event_status_markers(self):
        schema = self._schema()
        self.assertIn("now_utc >= novel_row.sale_starts_at", schema)
        self.assertIn("now_utc < novel_row.sale_ends_at", schema)
        self.assertIn("p_discount_percent integer", schema)
        self.assertIn("when now_utc < p_sale_starts_at then 'scheduled'::public.event_status", schema)
        self.assertIn("when now_utc >= p_sale_ends_at then 'ended'::public.event_status", schema)
        self.assertIn("'event_slug', event_slug", schema)
        self.assertIn("'sale_price', sale_price", schema)

    def test_upload_page_has_edit_mode_hooks(self):
        html = self._upload_html()
        self.assertIn("data-upload-mode-badge", html)
        self.assertIn("data-upload-page-title", html)
        self.assertIn("data-upload-page-subtitle", html)
        self.assertIn("data-upload-first-episode-section", html)

    def test_upload_script_has_edit_mode_contract_markers(self):
        js = self._upload_js()
        self.assertIn('mode: "create"', js)
        self.assertIn("editingNovelId: null", js)
        self.assertIn("existingCoverUrl: \"\"", js)
        self.assertIn("loadedNovel: null", js)
        self.assertIn("const editParam = search.get(\"edit\")", js)
        self.assertIn("state.mode = \"edit\"", js)
        self.assertIn("update_novel_for_author", js)
        self.assertIn("create_novel_with_episode", js)
        self.assertIn("coverUrl = uploadedCoverUrl || state.existingCoverUrl || null", js)
        self.assertIn("refs.firstEpisodeSection.hidden = state.mode === \"edit\"", js)
        self.assertIn('state.client.rpc("get_owned_novel_edit_payload_for_author"', js)

    def test_upload_script_edit_mode_ownership_gate_contract_markers(self):
        js = self._upload_js()
        self.assertIn("loadedForUserId: null", js)
        self.assertIn("editLoadRequestSeq: 0", js)
        self.assertIn("function clearLoadedEditState()", js)
        self.assertIn("state.loadedNovel = null", js)
        self.assertIn("state.loadedForUserId = null", js)
        self.assertIn("function cancelPendingEditLoadRequests()", js)
        self.assertIn("function isActiveEditLoadRequest(requestToken)", js)
        self.assertIn("seq: ++state.editLoadRequestSeq", js)
        self.assertIn("if (!isActiveEditLoadRequest(requestToken)) return;", js)
        self.assertIn("cancelPendingEditLoadRequests();", js)
        self.assertIn("showForm(false);", js)
        self.assertIn("clearLoadedEditState();", js)
        self.assertIn("state.loadedForUserId = session.user.id", js)
        self.assertIn("state.loadedForUserId === session.user.id", js)
        self.assertIn("if (button.dataset.customTag === \"true\")", js)
        self.assertIn("rebuildTagMap();", js)

    def test_upload_script_submit_stale_session_guard_contract_markers(self):
        js = self._upload_js()
        self.assertIn("submitRequestSeq: 0", js)
        self.assertIn("function cancelPendingSubmitRequests()", js)
        self.assertIn("function isActiveSubmitRequest(requestToken)", js)
        self.assertIn("function shouldCancelSubmitForAuthChange(previousSession, nextSession)", js)
        self.assertIn("const previousUserId = previousSession && previousSession.user ? previousSession.user.id : null;", js)
        self.assertIn("const nextUserId = nextSession && nextSession.user ? nextSession.user.id : null;", js)
        self.assertIn("return previousUserId !== nextUserId;", js)
        self.assertIn("state.submitRequestSeq += 1;", js)
        self.assertIn("state.submitRequestSeq === requestToken.seq", js)
        self.assertIn("state.session.user.id === requestToken.userId", js)
        self.assertIn("seq: ++state.submitRequestSeq", js)
        self.assertIn("if (!isActiveSubmitRequest(requestToken)) return;", js)
        self.assertIn("if (shouldCancelSubmitForAuthChange(previousSession, nextSession)) {", js)
        self.assertIn("if (shouldCancelSubmitForAuthChange(previousSession, session)) {", js)
        self.assertIn("cancelPendingSubmitRequests();", js)
        self.assertIn("if (!state.busy) return;", js)
        self.assertIn("state.busy = false;", js)
        self.assertNotIn("cancelPendingEditLoadRequests();\n    cancelPendingSubmitRequests();", js)
        self.assertNotIn("cancelPendingEditLoadRequests();\n      cancelPendingSubmitRequests();", js)

    def test_episode_upload_page_has_edit_mode_hooks(self):
        html = self._episode_upload_html()
        self.assertIn("data-episode-mode-badge", html)
        self.assertIn("data-episode-page-title", html)
        self.assertIn("data-episode-page-subtitle", html)
        self.assertIn("data-episode-edit-meta", html)
        self.assertIn("data-episode-edit-number", html)
        self.assertIn("data-episode-edit-updated", html)

    def test_episode_upload_script_has_edit_mode_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn('mode: "create"', js)
        self.assertIn("editingEpisodeId: null", js)
        self.assertIn("loadedEpisode: null", js)
        self.assertIn('lockedNovelSlug: ""', js)
        self.assertIn("loadedForUserId: null", js)
        self.assertIn("editLoadRequestSeq: 0", js)
        self.assertIn("submitRequestSeq: 0", js)
        self.assertIn('const editParam = query.get("edit")', js)
        self.assertIn('state.mode = "edit"', js)
        self.assertIn("state.editingEpisodeId = editParam.trim()", js)
        self.assertIn("refs.novelSelect.disabled = state.mode === \"edit\";", js)
        self.assertIn('state.client.rpc("update_episode_for_author"', js)
        self.assertIn('state.client.rpc("create_episode_for_author_novel"', js)

    def test_episode_upload_script_edit_mode_ownership_gate_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn("function clearLoadedEditState()", js)
        self.assertIn("state.loadedEpisode = null", js)
        self.assertIn("state.loadedForUserId = null", js)
        self.assertIn('state.lockedNovelSlug = ""', js)
        self.assertIn("function cancelPendingEditLoadRequests()", js)
        self.assertIn("function isActiveEditLoadRequest(requestToken)", js)
        self.assertIn("seq: ++state.editLoadRequestSeq", js)
        self.assertIn("if (!isActiveEditLoadRequest(requestToken)) return;", js)
        self.assertIn('state.client.rpc("get_owned_episode_edit_payload_for_author"', js)
        self.assertIn("state.loadedForUserId = session.user.id", js)
        self.assertIn("state.loadedForUserId === session.user.id", js)
        self.assertIn("showForm(false);", js)
        self.assertIn("clearLoadedEditState();", js)
        self.assertIn("refs.novelSelect.value = state.lockedNovelSlug;", js)

    def test_episode_upload_script_submit_stale_session_guard_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn("function shouldCancelSubmitForAuthChange(previousSession, nextSession)", js)
        self.assertIn("const previousUserId = previousSession && previousSession.user ? previousSession.user.id : null;", js)
        self.assertIn("const nextUserId = nextSession && nextSession.user ? nextSession.user.id : null;", js)
        self.assertIn("return previousUserId !== nextUserId;", js)
        self.assertIn("function cancelPendingSubmitRequests()", js)
        self.assertIn("function isActiveSubmitRequest(requestToken)", js)
        self.assertIn("state.submitRequestSeq += 1;", js)
        self.assertIn("state.submitRequestSeq === requestToken.seq", js)
        self.assertIn("state.session.user.id === requestToken.userId", js)
        self.assertIn("seq: ++state.submitRequestSeq", js)
        self.assertIn("if (shouldCancelSubmitForAuthChange(previousSession, nextSession)) {", js)
        self.assertIn("if (shouldCancelSubmitForAuthChange(previousSession, session)) {", js)
        self.assertIn("cancelPendingSubmitRequests();", js)
        self.assertIn("if (!state.busy) return;", js)
        self.assertIn("state.busy = false;", js)

    def test_schema_supports_owner_scoped_episode_index(self):
        schema = self._schema()
        self.assertIn("create or replace function public.list_owned_episodes_for_author", schema)
        block = self._function_block("list_owned_episodes_for_author(")
        self.assertIn("security definer", block)
        self.assertIn("auth.uid()", block)
        self.assertIn("a.user_id = current_user_id", block)

    def test_schema_avoids_rowtype_multi_target_into_patterns(self):
        schema = self._schema()
        self.assertNotIn("into novel_row, owner_user_id", schema)
        self.assertNotIn("into episode_row, episode_novel_slug", schema)
        self.assertNotIn("into episode_row, novel_slug_value", schema)
        self.assertNotIn("into episode_row, novel_slug_value, novel_status_value", schema)
        self.assertIn("returns table", block)
        self.assertIn("episode_id uuid", block)
        self.assertIn("status public.publish_status", block)

    def test_episode_upload_page_has_episode_index_hooks(self):
        html = self._episode_upload_html()
        self.assertIn("data-episode-index-count", html)
        self.assertIn("data-episode-index-list", html)
        self.assertIn("data-episode-index-empty", html)

    def test_episode_upload_script_exposes_episode_index_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn("episodes: []", js)
        self.assertIn("list_owned_episodes_for_author", js)
        self.assertIn("renderEpisodeIndex", js)
        self.assertIn("data-episode-hide", js)
        self.assertIn("data-episode-unhide", js)
        self.assertIn('row.status === "hidden"', js)
        self.assertIn("work.episodes", js)




    def test_episode_upload_page_has_episode_summary_and_bulk_action_hooks(self):
        html = self._episode_upload_html()
        self.assertIn("data-episode-summary-row", html)
        self.assertIn("data-episode-summary-published", html)
        self.assertIn("data-episode-summary-hidden", html)
        self.assertIn("data-episode-summary-trashed", html)
        self.assertIn("data-episode-bulk-actions", html)
        self.assertIn("data-episode-restore-all", html)
        self.assertIn("data-episode-purge", html)

    def test_episode_upload_script_exposes_episode_summary_and_bulk_action_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn("refs.episodeSummaryPublished", js)
        self.assertIn("refs.episodeSummaryHidden", js)
        self.assertIn("refs.episodeSummaryTrashed", js)
        self.assertIn("refs.episodeBulkActions", js)
        self.assertIn("function getEpisodeStats(work)", js)
        self.assertIn("function renderEpisodeSummary(work)", js)
        self.assertIn("restore_all_trashed_episodes_for_author", js)
        self.assertIn("purge_trashed_episodes_for_author", js)
        self.assertIn("data-episode-restore-all", js)
        self.assertIn("data-episode-purge", js)

    def test_schema_supports_bulk_trash_management_for_author(self):
        schema = self._schema()
        self.assertIn("create or replace function public.sync_novel_episode_counts", schema)
        self.assertIn("create or replace function public.restore_all_trashed_episodes_for_author", schema)
        self.assertIn("create or replace function public.purge_trashed_episodes_for_author", schema)
        restore_block = self._function_block("restore_all_trashed_episodes_for_author(")
        self.assertIn("a.user_id = current_user_id", restore_block)
        self.assertIn("status = 'hidden'::public.publish_status", restore_block)
        purge_block = self._function_block("purge_trashed_episodes_for_author(")
        self.assertIn("delete from public.episodes", purge_block)
        self.assertIn("perform public.sync_novel_episode_counts", purge_block)

    def test_episode_upload_page_has_episode_index_filter_hooks(self):
        html = self._episode_upload_html()
        self.assertIn("data-episode-filter-bar", html)
        self.assertIn('data-episode-filter="all"', html)
        self.assertIn('data-episode-filter="published"', html)
        self.assertIn('data-episode-filter="hidden"', html)
        self.assertIn('data-episode-filter="trashed"', html)

    def test_episode_upload_script_exposes_episode_index_filter_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn('episodeFilter: "all"', js)
        self.assertIn("refs.episodeFilterButtons", js)
        self.assertIn("function getFilteredEpisodes(work)", js)
        self.assertIn('state.episodeFilter === "all"', js)
        self.assertIn('row.status === state.episodeFilter', js)
        self.assertIn('btn.getAttribute("data-episode-filter")', js)
        self.assertIn("applyEpisodeFilter", js)

    def test_schema_supports_episode_trash_restore_for_author(self):
        schema = self._schema()
        self.assertIn("alter type public.publish_status add value if not exists 'trashed'", schema)
        self.assertIn("create or replace function public.trash_episode_for_author", schema)
        self.assertIn("create or replace function public.restore_trashed_episode_for_author", schema)
        trash_block = self._function_block("trash_episode_for_author(")
        self.assertIn("a.user_id = current_user_id", trash_block)
        self.assertIn("status = 'trashed'::public.publish_status", trash_block)
        restore_block = self._function_block("restore_trashed_episode_for_author(")
        self.assertIn("a.user_id = current_user_id", restore_block)
        self.assertIn("status = 'hidden'::public.publish_status", restore_block)

    def test_episode_upload_script_exposes_episode_trash_contract_markers(self):
        js = self._episode_upload_js()
        self.assertIn("data-episode-trash", js)
        self.assertIn("data-episode-restore", js)
        self.assertIn("trash_episode_for_author", js)
        self.assertIn("restore_trashed_episode_for_author", js)
        self.assertIn('row.status === "trashed"', js)
        self.assertIn("휴지통", js)
        self.assertIn("복원", js)

    def test_creator_dashboard_exposes_edit_and_sale_actions(self):
        html = self._creator_dashboard_html()
        script = self._creator_dashboard_js()
        self.assertIn("data-sale-panel", html)
        self.assertIn("작품 수정", script)
        self.assertIn("최근 회차 수정", script)
        self.assertIn("upsert_novel_sale_for_author", script)

    def test_schema_supports_archive_and_hide_actions(self):
        schema = self._schema()
        store = self._store_redesign_js()
        self.assertIn("create or replace function public.archive_novel_for_author", schema)
        self.assertIn("create or replace function public.hide_episode_for_author", schema)
        self.assertIn("status <> 'draft' and status <> 'archived'", schema)
        self.assertIn('status: "not.in.(draft,archived)"', store)

    def test_creator_dashboard_exposes_archive_and_hide_actions(self):
        html = self._creator_dashboard_html()
        script = self._creator_dashboard_js()
        self.assertIn("작품 보관", script)
        self.assertIn("최근 회차 숨김", script)
        self.assertIn("archive_novel_for_author", script)
        self.assertIn("hide_episode_for_author", script)
        self.assertIn("data-archive-open", script)
        self.assertIn("data-hide-episode", script)

    def test_schema_supports_restore_actions(self):
        schema = self._schema()
        self.assertIn("create or replace function public.unarchive_novel_for_author", schema)
        self.assertIn("create or replace function public.unhide_episode_for_author", schema)

    def test_creator_dashboard_exposes_restore_actions(self):
        script = self._creator_dashboard_js()
        self.assertIn("보관 해제", script)
        self.assertIn("최근 회차 다시 공개", script)
        self.assertIn("unarchive_novel_for_author", script)
        self.assertIn("unhide_episode_for_author", script)
        self.assertIn("data-unarchive-open", script)
        self.assertIn("data-unhide-episode", script)

    def test_creator_dashboard_exposes_archived_filter(self):
        html = self._creator_dashboard_html()
        script = self._creator_dashboard_js()
        self.assertIn('data-creator-head-stat="archived"', html)
        self.assertIn('data-creator-filter="archived"', html)
        self.assertIn('보관됨', html)
        self.assertIn("headArchived", script)
        self.assertIn('work.status === "archived"', script)
        self.assertIn("currentVisibleWorks()", script)

    def test_creator_dashboard_exposes_hidden_episode_list(self):
        script = self._creator_dashboard_js()
        self.assertIn("hiddenEpisodes", script)
        self.assertIn("creator-hidden-episodes", script)
        self.assertIn("숨김 회차", script)
        self.assertIn("renderHiddenEpisodeList", script)
        self.assertIn('row.status === "hidden"', script)
        self.assertIn("data-unhide-episode", script)

    def test_creator_dashboard_supports_sale_clear_action(self):
        html = self._creator_dashboard_html()
        script = self._creator_dashboard_js()
        schema = self._schema()
        self.assertIn("data-sale-clear", html)
        self.assertIn("할인 해제", script)
        self.assertIn("clear_novel_sale_for_author", script)
        self.assertIn("create or replace function public.clear_novel_sale_for_author", schema)

    def test_creator_sale_flow_refreshes_store_fields(self):
        schema = self._schema()
        dashboard = self._creator_dashboard_js()
        store = self._store_redesign_js()
        self.assertIn("bundle_sale_price", schema)
        self.assertIn("event_items", schema)
        self.assertIn("upsert_novel_sale_for_author", dashboard)
        self.assertIn("bundle_sale_price", store)
        self.assertIn("event_items", store)

    def test_edit_modes_redirect_back_to_existing_reader_routes(self):
        upload = self._upload_js()
        episode = self._episode_upload_js()
        dashboard_html = self._creator_dashboard_html()
        self.assertIn("novel_detail_pc.html?slug=", upload)
        self.assertIn("viewerHref", episode)
        self.assertIn("update_episode_for_author", episode)
        self.assertIn("assets/creator-dashboard.js", dashboard_html)


if __name__ == "__main__":
    unittest.main()
