import sqlite3
import tempfile
import unittest
from pathlib import Path
from migrate import migrate

class MigrationTest(unittest.TestCase):
    def test_expand_and_rollback_keep_orders_and_product_price(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'practice.db'
            with sqlite3.connect(path) as db:
                db.executescript((Path(__file__).parent / 'schema.sql').read_text())
                db.execute("INSERT INTO orders VALUES(1,'alice','k','h',1,2,2400,'accepted')")
            self.assertEqual(migrate(path, 'up'), 2)
            with sqlite3.connect(path) as db:
                self.assertEqual(db.execute('SELECT description FROM products').fetchone()[0], '')
            self.assertEqual(migrate(path, 'down'), 1)
            with sqlite3.connect(path) as db:
                self.assertEqual(db.execute('SELECT total FROM orders').fetchone()[0], 2400)
                self.assertEqual(db.execute('SELECT price FROM products').fetchone()[0], 1200)
                self.assertNotIn('description', [r[1] for r in db.execute('PRAGMA table_info(products)')])
            with self.assertRaises(ValueError):
                migrate(path, 'down')
    def test_missing_database_is_not_created(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'missing.db'
            with self.assertRaises(sqlite3.OperationalError):
                migrate(path, 'up')
            self.assertFalse(path.exists())
