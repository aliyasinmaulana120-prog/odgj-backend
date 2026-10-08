require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ===============================
// DATABASE INITIALIZATION
// ===============================

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      area TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT,
      description TEXT,
      image TEXT,
      instruction TEXT
    );

    CREATE TABLE IF NOT EXISTS scan_logs (
      id SERIAL PRIMARY KEY,
      username TEXT,
      asset_code TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("Database initialized");
}

// ===============================
// ROOT
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "ODGJ API ONLINE - DATABASE CONNECTED"
  });
});

// ===============================
// LOGIN
// ===============================

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username dan password wajib diisi"
      });
    }

    const result = await pool.query(
      `
      SELECT id, username, role, area
      FROM users
      WHERE username = $1
      AND password = $2
      `,
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Username atau password salah"
      });
    }

    res.json({
      message: "Login berhasil",
      user: result.rows[0]
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      message: "Terjadi kesalahan server"
    });
  }
});

// ===============================
// USERS
// ===============================

// GET USERS
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, role, area
      FROM users
      ORDER BY id ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil user"
    });
  }
});

// GET USER BY ID
app.get("/users/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, username, role, area
      FROM users
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil user"
    });
  }
});

// CREATE USER
app.post("/users", async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      area
    } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        message: "Username, password dan role wajib diisi"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (
        username,
        password,
        role,
        area
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role, area
      `,
      [
        username,
        password,
        role,
        area || null
      ]
    );

    res.status(201).json({
      message: "User berhasil dibuat",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Username sudah digunakan"
      });
    }

    res.status(500).json({
      message: "Gagal membuat user"
    });
  }
});

// UPDATE USER
app.put("/users/:id", async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      area
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET
        username = COALESCE($1, username),
        password = COALESCE($2, password),
        role = COALESCE($3, role),
        area = COALESCE($4, area)
      WHERE id = $5
      RETURNING id, username, role, area
      `,
      [
        username || null,
        password || null,
        role || null,
        area || null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    res.json({
      message: "User berhasil diperbarui",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal memperbarui user"
    });
  }
});

// DELETE USER
app.delete("/users/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, username
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    res.json({
      message: "User berhasil dihapus",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal menghapus user"
    });
  }
});

// ===============================
// ASSETS
// ===============================

// GET ALL ASSETS
app.get("/assets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM assets
      ORDER BY id ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil asset"
    });
  }
});

// GET ASSET BY ID
app.get("/assets/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM assets
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset tidak ditemukan"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil asset"
    });
  }
});

// CREATE ASSET
app.post("/assets", async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      image,
      instruction
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        message: "Code dan nama asset wajib diisi"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO assets (
        code,
        name,
        description,
        image,
        instruction
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        code,
        name,
        description || "",
        image || "",
        instruction || ""
      ]
    );

    res.status(201).json({
      message: "Asset berhasil dibuat",
      asset: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Kode asset sudah digunakan"
      });
    }

    res.status(500).json({
      message: "Gagal membuat asset"
    });
  }
});

// UPDATE ASSET
app.put("/assets/:id", async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      image,
      instruction
    } = req.body;

    const result = await pool.query(
      `
      UPDATE assets
      SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        image = COALESCE($4, image),
        instruction = COALESCE($5, instruction)
      WHERE id = $6
      RETURNING *
      `,
      [
        code || null,
        name || null,
        description ?? null,
        image ?? null,
        instruction ?? null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset tidak ditemukan"
      });
    }

    res.json({
      message: "Asset berhasil diperbarui",
      asset: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Kode asset sudah digunakan"
      });
    }

    res.status(500).json({
      message: "Gagal memperbarui asset"
    });
  }
});

// DELETE ASSET
app.delete("/assets/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM assets
      WHERE id = $1
      RETURNING id, code, name
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset tidak ditemukan"
      });
    }

    res.json({
      message: "Asset berhasil dihapus",
      asset: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal menghapus asset"
    });
  }
});

// ===============================
// SCAN
// ===============================

app.post("/scan", async (req, res) => {
  try {
    const {
      username,
      asset_code
    } = req.body;

    if (!username || !asset_code) {
      return res.status(400).json({
        message: "Username dan asset_code wajib diisi"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO scan_logs (
        username,
        asset_code
      )
      VALUES ($1, $2)
      RETURNING *
      `,
      [
        username,
        asset_code
      ]
    );

    res.status(201).json({
      message: "Scan tersimpan",
      scan: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal menyimpan scan"
    });
  }
});

// GET SCAN LOGS
app.get("/scan", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM scan_logs
      ORDER BY created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Gagal mengambil scan"
    });
  }
});

// ===============================
// START SERVER
// ===============================

init()
  .then(() => {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        "ODGJ API running on port " + PORT
      );
    });
  })
  .catch(err => {
    console.error(
      "DATABASE ERROR:",
      err
    );

    process.exit(1);
  });
