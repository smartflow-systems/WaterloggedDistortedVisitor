const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT DEFAULT 'SmartFlow Systems',
      your_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      calendar_link TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool TEXT NOT NULL,
      month_year TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, tool, month_year)
    );

    CREATE TABLE IF NOT EXISTS generated_files (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool TEXT NOT NULL,
      label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getUserByEmail(email) {
  const r = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return r.rows[0] || null;
}

async function getUserById(id) {
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0] || null;
}

async function createUser(name, email, passwordHash) {
  const r = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
    [name, email, passwordHash]
  );
  const user = r.rows[0];
  await pool.query("INSERT INTO user_settings (user_id) VALUES ($1)", [user.id]);
  return user;
}

async function getUserSettings(userId) {
  const r = await pool.query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
  return r.rows[0] || {};
}

async function saveUserSettings(userId, settings) {
  await pool.query(
    `INSERT INTO user_settings (user_id, business_name, your_name, email, phone, website, logo_url, calendar_link, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       your_name = EXCLUDED.your_name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       website = EXCLUDED.website,
       logo_url = EXCLUDED.logo_url,
       calendar_link = EXCLUDED.calendar_link,
       updated_at = NOW()`,
    [userId, settings.businessName || "SmartFlow Systems", settings.yourName || "",
     settings.email || "", settings.phone || "", settings.website || "",
     settings.logoUrl || "", settings.calendarLink || ""]
  );
}

function currentMonthYear() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const FREE_LIMIT = 5;

async function getUsage(userId) {
  const my = currentMonthYear();
  const r = await pool.query(
    "SELECT tool, count FROM usage WHERE user_id = $1 AND month_year = $2",
    [userId, my]
  );
  const map = {};
  for (const row of r.rows) map[row.tool] = row.count;
  return map;
}

async function incrementUsage(userId, tool) {
  const my = currentMonthYear();
  await pool.query(
    `INSERT INTO usage (user_id, tool, month_year, count) VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, tool, month_year) DO UPDATE SET count = usage.count + 1`,
    [userId, tool, my]
  );
}

async function canGenerate(userId, tool) {
  const user = await getUserById(userId);
  if (user.plan === "paid") return { allowed: true, remaining: Infinity };
  const my = currentMonthYear();
  const r = await pool.query(
    "SELECT count FROM usage WHERE user_id = $1 AND tool = $2 AND month_year = $3",
    [userId, tool, my]
  );
  const used = r.rows[0]?.count || 0;
  const remaining = FREE_LIMIT - used;
  return { allowed: remaining > 0, remaining, limit: FREE_LIMIT };
}

async function upgradeUserToPaid(stripeCustomerId, stripeSubscriptionId) {
  await pool.query(
    "UPDATE users SET plan = 'paid', stripe_customer_id = $1, stripe_subscription_id = $2 WHERE stripe_customer_id = $3",
    [stripeCustomerId, stripeSubscriptionId, stripeCustomerId]
  );
}

async function setStripeCustomerId(userId, customerId) {
  await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customerId, userId]);
}

async function getUserByStripeCustomer(customerId) {
  const r = await pool.query("SELECT * FROM users WHERE stripe_customer_id = $1", [customerId]);
  return r.rows[0] || null;
}

async function downgradeUserToFree(stripeCustomerId) {
  await pool.query(
    "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = $1",
    [stripeCustomerId]
  );
}

module.exports = {
  pool, initDb, getUserByEmail, getUserById, createUser,
  getUserSettings, saveUserSettings, getUsage, incrementUsage,
  canGenerate, upgradeUserToPaid, setStripeCustomerId,
  getUserByStripeCustomer, downgradeUserToFree, FREE_LIMIT
};
