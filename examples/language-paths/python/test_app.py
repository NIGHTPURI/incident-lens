import unittest
from app import Store


class StoreTests(unittest.TestCase):
    def test_create_replay_conflict_and_missing_product(self):
        store = Store()
        first_status, order = store.create("a", 1, 2)
        self.assertEqual((first_status, order["total"], order["status"]), (201, 2400, "accepted"))
        self.assertEqual(store.create("a", 1, 2), (200, order))
        self.assertEqual(store.create("a", 1, 3)[0], 409)
        self.assertEqual(store.create("b", 9, 1)[0], 404)
        self.assertEqual(store.create("b", 1, 0)[0], 400)
        self.assertEqual(len(store.orders), 1)


if __name__ == "__main__":
    unittest.main()
