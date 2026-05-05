const DB = require('better-sqlite3');
const db = new DB('friperie_luxe.db');
console.log('Users:', db.prepare('SELECT id, username, status FROM users').all());
console.log('Products:', db.prepare('SELECT COUNT(*) as c FROM products').all());
console.log('Sales:', db.prepare('SELECT COUNT(*) as c FROM sales').all());
