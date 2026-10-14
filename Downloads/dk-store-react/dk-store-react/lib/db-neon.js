const { AsyncLocalStorage } = require("node:async_hooks");
const { Pool } = require("@neondatabase/serverless");

const transactionClient = new AsyncLocalStorage();
let pool;
let initialization;

const schema = [
  `CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT DEFAULT '',
    address TEXT DEFAULT '', salt TEXT NOT NULL, hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    created_at BIGINT NOT NULL, totp_secret TEXT, totp_on INTEGER NOT NULL DEFAULT 0, tv INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS resets(
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit(
    id SERIAL PRIMARY KEY, ts BIGINT NOT NULL, user_id INTEGER, email TEXT, event TEXT NOT NULL, ip TEXT, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS products(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', points TEXT DEFAULT '',
    price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0, reorder INTEGER NOT NULL DEFAULT 5,
    image TEXT DEFAULT '', bundle TEXT, active INTEGER NOT NULL DEFAULT 1, track INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS orders(
    id SERIAL PRIMARY KEY, no TEXT NOT NULL UNIQUE, user_id INTEGER REFERENCES users(id), name TEXT NOT NULL,
    phone TEXT NOT NULL, city TEXT DEFAULT '', address TEXT DEFAULT '', payment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', source TEXT NOT NULL DEFAULT 'web', total INTEGER NOT NULL,
    created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS order_items(
    id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL,
    name TEXT NOT NULL, qty INTEGER NOT NULL, unit INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS stock_log(
    id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL, delta INTEGER NOT NULL, reason TEXT, ts BIGINT NOT NULL)`,
];

function normalizeRows(result) {
  for (const row of result.rows) {
    for (const field of result.fields) {
      if (field.dataTypeID === 20 && row[field.name] !== null) row[field.name] = Number(row[field.name]);
    }
  }
  return result.rows;
}

function sqlWithParameters(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function query(sql, params = []) {
  const client = transactionClient.getStore();
  return (client || pool).query(sql, params).then((result) => {
    normalizeRows(result);
    return result;
  });
}

async function initialize() {
  if (!initialization) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    initialization = (async () => {
      for (const statement of schema) await query(statement);
      await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT");
      await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_on INTEGER NOT NULL DEFAULT 0");
      await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tv INTEGER NOT NULL DEFAULT 0");
      await query("ALTER TABLE products ADD COLUMN IF NOT EXISTS track INTEGER NOT NULL DEFAULT 1");
      await query("CREATE UNIQUE INDEX IF NOT EXISTS users_one_admin ON users(role) WHERE role='admin'");

      const result = await query("SELECT COUNT(*) AS c FROM products");
      if (Number(result.rows[0].c) === 0) {
        await query(
          `INSERT INTO products(id,name,description,points,price,stock,reorder,image,bundle,track)
           VALUES
           (1,'Ceramic Shampoo 500ml','Car shampoo with a new advanced formula.','Deep clean,High gloss,pH balanced',600,0,5,'shampoo.jpg',NULL,0),
           (2,'Glass Cleaner','Streak-free shine for crystal clear visibility.','Streak free,Quick dry,Safe on all surfaces',550,0,5,'glass.jpg',NULL,0),
           (3,'Deal: Shampoo + Glass Cleaner','Get the Ceramic Shampoo and the Glass Cleaner together.','Both products,One price',1100,0,0,'deal.jpg','[[1,1],[2,1]]',0)
           ON CONFLICT(id) DO NOTHING`,
        );
        await query("SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST((SELECT MAX(id) FROM products), 1))");
      }
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

function prepare(sql) {
  return {
    async get(...params) {
      await initialize();
      return (await query(sqlWithParameters(sql), params)).rows[0];
    },
    async all(...params) {
      await initialize();
      return (await query(sqlWithParameters(sql), params)).rows;
    },
    async run(...params) {
      await initialize();
      let statement = sqlWithParameters(sql);
      if (/^\s*INSERT\s+INTO\b/i.test(statement) && !/\bRETURNING\b/i.test(statement)) statement += " RETURNING id";
      const result = await query(statement, params);
      return { changes: result.rowCount, lastInsertRowid: result.rows[0] && result.rows[0].id };
    },
  };
}

async function exec(sql) {
  await initialize();
  return query(sql);
}

async function transaction(fn) {
  await initialize();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionClient.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initialize,
  prepare,
  exec,
  transaction,
  close: () => pool && pool.end(),
};
