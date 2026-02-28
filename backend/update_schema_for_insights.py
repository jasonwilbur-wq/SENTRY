import sqlite3

DB_PATH = 'C:/Users/j0w16ja/SENTRY_v2-main/backend/data/sentry.db'

def add_column_if_not_exists(cur, table, col_def):
    try:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
        print(f"Added column {col_def} to {table}")
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e):
            pass
        else:
            raise e

def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Extended Vendor Info
    add_column_if_not_exists(cur, 'vendors', "description TEXT DEFAULT ''")
    add_column_if_not_exists(cur, 'vendors', "founded_year TEXT DEFAULT ''")
    add_column_if_not_exists(cur, 'vendors', "hq_location TEXT DEFAULT ''")
    
    # Walmart Business Context
    add_column_if_not_exists(cur, 'vendors', "business_owner TEXT DEFAULT ''")
    add_column_if_not_exists(cur, 'vendors', "sourcing_manager TEXT DEFAULT ''")
    add_column_if_not_exists(cur, 'vendors', "deployment_status TEXT DEFAULT 'Prospect'") # Prospect, PoC, Pilot, Production, Retired

    # Technical Profile
    add_column_if_not_exists(cur, 'vendors', "hosting_type TEXT DEFAULT ''") # SaaS, On-prem, Hybrid
    add_column_if_not_exists(cur, 'vendors', "data_classification TEXT DEFAULT 'Internal'") # Public, Internal, Confidential, Restricted

    con.commit()
    con.close()
    print("Schema updated successfully.")

if __name__ == '__main__':
    main()