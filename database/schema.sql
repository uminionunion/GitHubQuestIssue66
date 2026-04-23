-- ============================================================================
-- MILLION PIXEL GRID - DATABASE SCHEMA
-- 
-- This file documents the database structure.
-- In practice, tables are created by db.js automatically.
-- ============================================================================

-- TABLE 1: USERS
-- Stores user account information
-- 
-- Columns:
-- - id: Unique identifier (auto-incrementing primary key)
-- - email: User's email (unique, required)
-- - password_hash: Encrypted password (bcrypt hash)
-- - created_at: When account was created
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: PIXELS
-- Stores data for all 1,000,000 pixels
-- This table will have 1 million rows (one per pixel)
-- 
-- Columns:
-- - id: Unique pixel identifier
-- - x, y: Coordinates on grid (0-999)
-- - color: Hex color code (e.g., "#FF0000" for red)
-- - current_price: Price in cents ($200 = $2.00)
-- - purchase_count: How many times purchased (0-10)
-- - owner_user_id: Which user owns it (NULL if unowned)
-- - color_changes_available: How many times user can change color
-- - created_at: When pixel was created
CREATE TABLE pixels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT,
  current_price INTEGER DEFAULT 2,
  purchase_count INTEGER DEFAULT 0,
  owner_user_id INTEGER,
  color_changes_available INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(x, y),
  FOREIGN KEY(owner_user_id) REFERENCES users(id)
);

-- TABLE 3: PURCHASES
-- Records every pixel purchase transaction
-- 
-- Columns:
-- - id: Transaction ID
-- - user_id: Which user made purchase
-- - pixel_id: Which pixel was purchased
-- - price_paid: How much was paid (in cents)
-- - purchase_number: Is this purchase #1, #2, ... #10?
-- - stripe_session_id: Stripe checkout session ID
-- - timestamp: When purchase happened
CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pixel_id INTEGER NOT NULL,
  price_paid INTEGER NOT NULL,
  purchase_number INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  stripe_session_id TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(pixel_id) REFERENCES pixels(id)
);

-- INDEXES (for performance)
-- These speed up queries that search by these columns
CREATE INDEX IF NOT EXISTS idx_pixels_xy ON pixels(x, y);
CREATE INDEX IF NOT EXISTS idx_pixels_owner ON pixels(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_pixel ON purchases(pixel_id);
