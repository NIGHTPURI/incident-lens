"""Versioned SQLite expand/rollback exercise for a stopped, isolated practice DB."""
import argparse
import sqlite3
from pathlib import Path


def migrate(path, direction):
    # mode=rw refuses to create a database accidentally.
    with sqlite3.connect(Path(path).resolve().as_uri() + '?mode=rw', uri=True) as db:
        version = db.execute('PRAGMA user_version').fetchone()[0]
        expected = (0, 1) if direction == 'up' else (2,)
        if version not in expected:
            raise ValueError(f'Unexpected schema version {version} for {direction}')
        sql = (Path(__file__).parent / 'migrations' / f'002_{direction}.sql').read_text()
        try:
            db.executescript('BEGIN EXCLUSIVE;\n' + sql + '\nCOMMIT;')
        except BaseException:
            if db.in_transaction:
                db.rollback()
            raise
        return db.execute('PRAGMA user_version').fetchone()[0]


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True)
    parser.add_argument('direction', choices=['up', 'down'])
    args = parser.parse_args()
    print(f'schema version: {migrate(args.db, args.direction)}')
