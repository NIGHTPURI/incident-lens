import tempfile
import unittest
from pathlib import Path

from store import Store


class DurableOrderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / "isolated.db")
        self.store = Store(self.path)

    def test_replay_owner_scope_and_delayed_completion_survive_reopen(self):
        code, first = self.store.create("alice", "key-1", 1, 2)
        self.assertEqual((code, first["status"], self.store.pending()), (201, "accepted", 1))
        self.assertEqual(self.store.create("alice", "key-1", 1, 2), (200, first))
        self.assertEqual(self.store.create("alice", "key-1", 1, 3)[0], 409)
        self.assertEqual(self.store.create("bob", "key-1", 1, 2)[0], 201)
        reopened = Store(self.path)
        self.assertEqual(reopened.find(first["id"])[0], "alice")
        self.assertTrue(reopened.process_one())
        self.assertEqual(reopened.find(first["id"])[1]["status"], "fulfilled")

    def test_order_and_outbox_roll_back_together(self):
        with self.assertRaises(RuntimeError):
            self.store.create("alice", "fail", 1, 2, fail_after_order=True)
        self.assertIsNone(self.store.find(1))
        self.assertEqual(self.store.pending(), 0)


if __name__ == "__main__":
    unittest.main()
