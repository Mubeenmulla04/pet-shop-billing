const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();

    await client.query(`
      INSERT INTO admins (username, password_hash)
      VALUES (
        'MD_SAAD',
        '$2a$10$F0WuqhJ8sJZspWQnqN4C5e6mK7o1pJvR4VnJ6VvQrfQmXyqNf6q2'
      )
      ON CONFLICT (username) DO UPDATE
      SET password_hash = EXCLUDED.password_hash;
    `);

    console.log("✅ Admin created: MD_SAAD / saad@petshop");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
})();
