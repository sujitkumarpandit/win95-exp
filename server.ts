import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Database Configuration ---
const { Pool } = pg;
let pool: any = null;

function getPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    
    // Comprehensive check for placeholders or incomplete values
    if (!connectionString || connectionString === "" || 
        connectionString.includes("YOUR_POSTGRES") || 
        connectionString.includes("[PROJECT-REF]") ||
        connectionString.includes("[PASS]") ||
        connectionString.includes("[REF]")) {
       console.warn("WARNING: DATABASE_URL is missing or using placeholder text.");
       return null;
    }

    // Check for common bracket errors
    if (connectionString.includes("[") || connectionString.includes("]")) {
       console.error("CRITICAL: DATABASE_URL contains brackets [...]. Please remove them.");
       return null;
    }

    // Force postgres:// if postgresql:// is used, some older libs prefer it
    if (connectionString.startsWith("postgresql://")) {
      connectionString = connectionString.replace("postgresql://", "postgres://");
    }

    // Robust password encoding check
    // If the string has multiple @ and no %40, it's likely unencoded
    const parts = connectionString.split("@");
    if (parts.length > 2 && !connectionString.includes("%40")) {
       console.error("CRITICAL ERROR: Your DATABASE_URL password contains '@' but is not encoded.");
       console.error("Detected", parts.length - 1, "at-symbols (@). Only the one before the host should be unencoded.");
       console.error("FIX: In your password, replace '@' with '%40'.");
       return null;
    }

    console.log("Initializing database pool...");
    console.log("Protocol:", connectionString.split(":")[0]);
    console.log("Host identified as:", connectionString.split("@")[1]?.split(":")[0] || "unknown");
    
    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000, 
        max: 20, 
        idleTimeoutMillis: 30000,
      });
      
      pool.on('error', (err: Error) => {
        console.error('DATABASE POOL ERROR:', err.message);
      });
      
      console.log("Database pool object created.");
    } catch (err) {
      console.error("FAILED to initialize pool constructor:", (err as Error).message);
      return null;
    }
  }
  return pool;
}

// --- Database Table Initialization ---
async function initDb() {
  const p = getPool();
  if (!p) {
    console.warn("Database connection could not be initialized. Check DATABASE_URL.");
    return;
  }

  try {
    console.log("Connecting to database for table initialization...");
    const client = await p.connect();
    console.log("Successfully connected to database!");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          income DECIMAL(12, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        -- Migration: add income column if table exists without it
        ALTER TABLE users ADD COLUMN IF NOT EXISTS income DECIMAL(12, 2) DEFAULT 0;
        
        CREATE TABLE IF NOT EXISTS income_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(12, 2) NOT NULL,
          description TEXT DEFAULT 'Added Funds',
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          amount DECIMAL(12, 2) NOT NULL,
          payment_method VARCHAR(50),
          status VARCHAR(50) DEFAULT 'Pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS custom_categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        );
      `);
      console.log("✓ Database tables verified/initialized.");
    } finally {
      client.release();
    }
  } catch (err) {
    const error = err as Error;
    console.error("✘ Database initialization failed!");
    console.error("Error Message:", error.message);
    
    if (error.message.includes("ECONNREFUSED")) {
      console.error("HINT: Connection Refused. If using Supabase, make sure you are using the 'Transaction Pooler' (Port 6543) and host ending in .pooler.supabase.com");
    } else if (error.message.includes("password authentication failed")) {
      console.error("HINT: Password authentication failed. Check your password in the DATABASE_URL secret.");
    }
  }
}

// Helper to check DB connection
app.get("/api/health", async (req, res) => {
  const p = getPool();
  if (!p) {
    let specificMessage = "DATABASE_URL secret is missing or invalid.";
    const conn = process.env.DATABASE_URL;
    if (conn && conn.includes("[") && conn.includes("]")) {
      specificMessage = "ERROR: You have brackets [...] in your DATABASE_URL. Please remove them.";
    } else if (conn && (conn.match(/@/g) || []).length > 1 && !conn.includes("%40")) {
      specificMessage = "ERROR: Your password contains '@'. Use '%40' instead of '@' inside your password in the connection string.";
    } else if (!conn) {
      specificMessage = "ERROR: DATABASE_URL secret is not set in AI Studio Settings (Secrets).";
    }
    
    return res.status(500).json({ 
      status: "error", 
      message: specificMessage 
    });
  }
  try {
    const client = await p.connect();
    client.release();
    res.json({ status: "ok" });
  } catch (err) {
    const error = err as Error;
    console.error("Database Connection Error:", error.message);
    
    let userFriendlyMessage = "Could not connect to database.";
    if (error.message.includes("ECONNREFUSED")) {
      userFriendlyMessage = "Connection refused. TIP: If using Supabase, ensure you are using the 'Transaction Pooler' connection string (port 6543) with the correct host (usually ends in .pooler.supabase.com).";
    } else if (error.message.includes("password authentication failed")) {
      userFriendlyMessage = "Database password authentication failed. Please verify your password in the DATABASE_URL secret.";
    } else if (error.message.includes("self signed certificate")) {
      userFriendlyMessage = "SSL connection failed. The server requires a secure connection.";
    }

    res.status(500).json({ 
      status: "error", 
      message: userFriendlyMessage,
      detail: error.message
    });
  }
});

// --- Authentication Middleware ---
const JWT_SECRET = process.env.JWT_SECRET || "win95-retro-secret-key-1995";

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await p.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, income",
      [email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if ((err as any).code === '23505') {
      res.status(400).json({ error: "Email already registered" });
    } else {
      res.status(500).json({ error: (err as Error).message });
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      res.json({ accessToken, user: { id: user.id, email: user.email, income: user.income } });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Expense Routes ---
app.get("/api/expenses", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/expenses", authenticateToken, async (req: any, res) => {
  const { date, category, description, amount, payment_method, status } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      "INSERT INTO expenses (user_id, date, category, description, amount, payment_method, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.user.id, date, category, description, amount, payment_method, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/api/expenses/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { date, category, description, amount, payment_method, status } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      "UPDATE expenses SET date=$1, category=$2, description=$3, amount=$4, payment_method=$5, status=$6 WHERE id=$7 AND user_id=$8 RETURNING *",
      [date, category, description, amount, payment_method, status, id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Expense not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Expense not found" });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Category Routes ---
app.get("/api/categories", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      "SELECT name FROM custom_categories WHERE user_id = $1 ORDER BY name ASC",
      [req.user.id]
    );
    res.json(result.rows.map((row: any) => row.name));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/categories", authenticateToken, async (req: any, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") return res.status(400).json({ error: "Category name required" });

  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      "INSERT INTO custom_categories (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING RETURNING *",
      [req.user.id, name.trim()]
    );
    res.status(201).json(result.rows[0] || { name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/categories/:name", authenticateToken, async (req: any, res) => {
  const { name } = req.params;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    await p.query(
      "DELETE FROM custom_categories WHERE user_id = $1 AND name = $2",
      [req.user.id, name]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/categories/stats", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      `SELECT category, 
              COUNT(*)::int as count, 
              SUM(amount)::float as total_amount,
              ROUND((SUM(amount)::numeric / NULLIF(SUM(SUM(amount)) OVER (), 0)) * 100, 2)::float as percentage
       FROM expenses 
       WHERE user_id = $1 
       GROUP BY category 
       ORDER BY total_amount DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/reports/monthly", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  const year = req.query.year || new Date().getFullYear();

  try {
    const result = await p.query(
      `SELECT 
        TO_CHAR(date, 'Mon') as month,
        EXTRACT(MONTH FROM date) as month_num,
        SUM(amount)::float as total
       FROM expenses 
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
       GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
       ORDER BY month_num`,
      [req.user.id, year]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/reports/yearly", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  try {
    const result = await p.query(
      `SELECT 
        EXTRACT(YEAR FROM date) as year,
        category,
        SUM(amount)::float as total
       FROM expenses 
       WHERE user_id = $1
       GROUP BY EXTRACT(YEAR FROM date), category
       ORDER BY year DESC, total DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/reports/detailed", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });

  const { grain = 'month', year = new Date().getFullYear() } = req.query;
  
  let dateTrunc;
  let orderBy;
  let whereClause = "WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2::int";
  const params: any[] = [req.user.id, year];

  switch(grain) {
    case 'day': 
      dateTrunc = "TO_CHAR(date, 'DD Mon')";
      orderBy = "MIN(date)";
      break;
    case 'week':
      dateTrunc = "'Wk ' || TO_CHAR(date, 'WW')";
      orderBy = "MIN(date)";
      break;
    case 'year':
      dateTrunc = "EXTRACT(YEAR FROM date)::text";
      orderBy = "MIN(date)";
      whereClause = "WHERE user_id = $1"; // No year filter for multi-year view
      params.pop(); // Remove year from params
      break;
    default: // month
      dateTrunc = "TO_CHAR(date, 'Mon')";
      orderBy = "EXTRACT(MONTH FROM MIN(date))";
  }

  try {
    const result = await p.query(
      `SELECT 
        ${dateTrunc} as label,
        category,
        SUM(amount)::float as total
       FROM expenses 
       ${whereClause}
       GROUP BY 1, 2
       ORDER BY ${orderBy}, total DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- User Profile Routes ---
app.get("/api/user/income", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    const result = await p.query("SELECT income FROM users WHERE id = $1", [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/user/income", authenticateToken, async (req: any, res) => {
  const { income } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    // Clear history and set a single base transaction for consistency
    await p.query("DELETE FROM income_transactions WHERE user_id = $1", [req.user.id]);
    await p.query(
      "INSERT INTO income_transactions (user_id, amount, description) VALUES ($1, $2, $3)",
      [req.user.id, income, 'Initial Balance Overwrite']
    );

    const result = await p.query(
      "UPDATE users SET income = $1 WHERE id = $2 RETURNING income",
      [income, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Income Transactions API ---
app.get("/api/income", authenticateToken, async (req: any, res) => {
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    const result = await p.query(
      "SELECT * FROM income_transactions WHERE user_id = $1 ORDER BY date DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/income", authenticateToken, async (req: any, res) => {
  const { amount, description } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
     const result = await p.query(
      "INSERT INTO income_transactions (user_id, amount, description) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, amount, description || 'Added Funds']
    );
    
    // Update total user income cache
    const totalResult = await p.query(
      "UPDATE users SET income = (SELECT COALESCE(SUM(amount), 0) FROM income_transactions WHERE user_id = $1) WHERE id = $1 RETURNING income",
      [req.user.id]
    );
    
    res.json({ transaction: result.rows[0], income: totalResult.rows[0].income });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/api/income/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    await p.query(
      "UPDATE income_transactions SET amount = $1, description = $2 WHERE id = $3 AND user_id = $4",
      [amount, description, id, req.user.id]
    );
    
    // Update total user income cache
    const totalResult = await p.query(
      "UPDATE users SET income = (SELECT COALESCE(SUM(amount), 0) FROM income_transactions WHERE user_id = $1) WHERE id = $1 RETURNING income",
      [req.user.id]
    );
    
    res.json({ income: totalResult.rows[0].income });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/income/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    await p.query("DELETE FROM income_transactions WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    
    // Update total user income cache
    const totalResult = await p.query(
      "UPDATE users SET income = (SELECT COALESCE(SUM(amount), 0) FROM income_transactions WHERE user_id = $1) WHERE id = $1 RETURNING income",
      [req.user.id]
    );
    
    res.json({ income: totalResult.rows[0].income });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/user/income/add", authenticateToken, async (req: any, res) => {
  const { amount } = req.body;
  const p = getPool();
  if (!p) return res.status(500).json({ error: "DB not configured" });
  try {
    // Legacy route kept for compatibility but redirected to transaction system
    const txResult = await p.query(
      "INSERT INTO income_transactions (user_id, amount, description) VALUES ($1, $2, $3) RETURNING id",
      [req.user.id, amount, 'Add Funds']
    );
    
    const result = await p.query(
      "UPDATE users SET income = (SELECT COALESCE(SUM(amount), 0) FROM income_transactions WHERE user_id = $1) WHERE id = $1 RETURNING income",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Vite Development Setup ---
async function startServer() {
  // Initialize database tables
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
