import sqlite3
import re

db = sqlite3.connect('C:/Users/toure/AppData/Roaming/friperie-de-luxe/friperie_luxe.db')

def normalize(phone):
    return re.sub(r'[^0-9]', '', str(phone or ''))

customers = db.execute('SELECT id, name, phone FROM delivery_customers').fetchall()
print('Customers:', [(c[0], c[1], normalize(c[2])) for c in customers])

deliveries = db.execute('SELECT id, customer_name, customer_phone, customer_id FROM deliveries').fetchall()

updated = 0
for cust_id, cust_name, cust_phone in customers:
    cust_norm = normalize(cust_phone)
    if not cust_norm:
        continue
    # Get last 8 digits for matching
    cust_suffix = cust_norm[-8:] if len(cust_norm) >= 8 else cust_norm
    for d_id, d_name, d_phone, d_cust_id in deliveries:
        if d_cust_id is not None:
            continue
        d_norm = normalize(d_phone)
        if d_norm and (d_norm.endswith(cust_suffix) or cust_norm.endswith(d_norm[-8:])):
            db.execute('UPDATE deliveries SET customer_id = ? WHERE id = ?', (cust_id, d_id))
            print(f'  Delivery {d_id} ({d_name}/{d_phone}) -> customer {cust_id} ({cust_name}/{cust_phone})')
            updated += 1

db.commit()
print(f'Total updated: {updated}')

# Verify
rows = db.execute('SELECT id, customer_id, customer_name, customer_phone FROM deliveries').fetchall()
print('\nFinal state:')
for r in rows:
    print(r)
db.close()
