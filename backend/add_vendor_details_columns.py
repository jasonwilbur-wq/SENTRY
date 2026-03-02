"""Migration script to add vendor detail columns for highlights, pros, cons, concerns, use cases.

Run this once to extend the vendors table with new fields.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

ALTER_COMMANDS = [
    "ALTER TABLE vendors ADD COLUMN vendor_highlight TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN pros TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN cons TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN concerns TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN use_cases TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN value_to_walmart TEXT DEFAULT ''",
    "ALTER TABLE vendors ADD COLUMN maturity_level TEXT DEFAULT ''",
]

def main():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Check which columns already exist
    cursor.execute("PRAGMA table_info(vendors)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    
    added = 0
    for cmd in ALTER_COMMANDS:
        col_name = cmd.split("ADD COLUMN ")[1].split()[0]
        if col_name in existing_cols:
            print(f"✓ Column '{col_name}' already exists, skipping...")
            continue
        
        try:
            cursor.execute(cmd)
            conn.commit()
            print(f"✅ Added column: {col_name}")
            added += 1
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"⚠ Column '{col_name}' already exists (caught by error), skipping...")
            else:
                print(f"❌ Error adding {col_name}: {e}")
    
    conn.close()
    print(f"\n🎉 Migration complete! Added {added} new column(s).")

if __name__ == "__main__":
    main()
