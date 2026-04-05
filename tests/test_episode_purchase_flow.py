from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class EpisodePurchaseFlowTests(unittest.TestCase):
    def test_schema_defines_purchase_rpc(self):
        schema = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8")
        self.assertIn("create or replace function public.purchase_episode", schema)

    def test_live_script_calls_purchase_rpc(self):
        script = (ROOT / "assets" / "supabase-live.js").read_text(encoding="utf-8")
        self.assertIn('rpc("purchase_episode"', script)

    def test_store_redesign_exposes_purchase_button_hook(self):
        script = (ROOT / "assets" / "store-redesign.js").read_text(encoding="utf-8")
        self.assertIn("data-purchase-button", script)

    def test_store_redesign_fetches_purchase_ownership(self):
        script = (ROOT / "assets" / "store-redesign.js").read_text(encoding="utf-8")
        self.assertIn("async function ownershipForNovel", script)

    def test_store_redesign_marks_owned_episodes(self):
        script = (ROOT / "assets" / "store-redesign.js").read_text(encoding="utf-8")
        self.assertIn("보유함", script)

    def test_store_redesign_checks_owned_state_before_paywall(self):
        script = (ROOT / "assets" / "store-redesign.js").read_text(encoding="utf-8")
        self.assertIn("ownedEpisodeIds", script)


if __name__ == "__main__":
    unittest.main()
