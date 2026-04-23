/**
 * DATABASE MODULE
 * 
 * This file handles all SQLite database operations.
 * It creates the connection, initializes tables, and provides
 * helper functions for querying the database.
 * 
 * Key responsibilities:
 * 1. Create/connect to SQLite database
 * 2. Initialize tables if they don't exist
 * 3. Provide query functions for other modules
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ==================== DATABASE CONNECTION ====================
// Create SQLite database file at specified path
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/million-pixel.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// ==================== DATABASE INITIALIZATION ====================
/**
 * Function: initializeDatabase()
 * Purpose: Create all required tables if they don't exist
 * 
 * Tables created:
 * 1. users - Store user accounts
 * 2. pixels - Store pixel data (1,000,000 pixels)
 * 3. purchases - Store purchase history
 * 
 * Returns: Promise that resolves when all tables are created
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Begin transaction (faster for bulk operations)
    db.serialize(() => {
      // ---- TABLE 1: USERS ----
      // Stores user account information
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating users table:', err);
          reject(err);
        } else {
          console.log('✅ Users table ready');
        }
      });

      // ---- TABLE 2: PIXELS ----
      // Stores data for each of the 1,000,000 pixels
      db.run(`
        CREATE TABLE IF NOT EXISTS pixels (
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
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating pixels table:', err);
          reject(err);
        } else {
          console.log('✅ Pixels table ready');
        }
      });

      // ---- TABLE 3: PURCHASES ----
      // Stores record of every pixel purchase transaction
      db.run(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          pixel_id INTEGER NOT NULL,
          price_paid INTEGER NOT NULL,
          purchase_number INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          stripe_session_id TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(pixel_id) REFERENCES pixels(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating purchases table:', err);
          reject(err);
        } else {
          console.log('✅ Purchases table ready');
        }
      });

      // Check if pixels table is empty, if so, populate it
      db.get('SELECT COUNT(*) as count FROM pixels', (err, row) => {
        if (err) {
          console.error('❌ Error checking pixels table:', err);
          reject(err);
        } else if (row.count === 0) {
          // Table is empty, populate with 1,000,000 pixels
          console.log('📊 Populating 1,000,000 pixels... This may take a moment...');
          populatePixels()
            .then(() => {
              console.log('✅ All 1,000,000 pixels created');
              resolve();
            })
            .catch(reject);
        } else {
          console.log(`✅ Pixels table has ${row.count} pixels`);
          resolve();
        }
      });
    });
  });
};

// ==================== PIXEL POPULATION ====================
/**
 * Function: populatePixels()
 * Purpose: Insert all 1,000,000 pixels into database
 * 
 * Algorithm:
 * 1. Create 1,000 batches of 1,000 pixels each
 * 2. Insert each batch in a transaction (faster than individual inserts)
 * 3. Track progress every 100 batches
 * 
 * Returns: Promise that resolves when complete
 */
const populatePixels = () => {
  return new Promise((resolve, reject) => {
    const BATCH_SIZE = 1000;
    const TOTAL_PIXELS = 1000000;
    const GRID_SIZE = 1000;

    let pixelsInserted = 0;

    // Function to insert one batch
    const insertBatch = (batchNumber) => {
      // Calculate range of pixels for this batch
      const startPixel = batchNumber * BATCH_SIZE;
      const endPixel = Math.min(startPixel + BATCH_SIZE, TOTAL_PIXELS);

      // Build SQL insert statement for this batch
      let insertSQL = 'INSERT INTO pixels (x, y) VALUES ';
      let values = [];

      // Create value placeholders for each pixel
      for (let i = startPixel; i < endPixel; i++) {
        // Convert pixel number to x, y coordinates
        const x = i % GRID_SIZE;
        const y = Math.floor(i / GRID_SIZE);
        values.push(`(${x}, ${y})`);
      }

      // Complete SQL statement
      insertSQL += values.join(',');

      // Execute batch insert
      db.run(insertSQL, (err) => {
        if (err) {
          console.error(`❌ Error inserting batch ${batchNumber}:`, err);
          reject(err);
        } else {
          pixelsInserted = endPixel;

          // Log progress every 100 batches
          if (batchNumber % 100 === 0) {
            console.log(`  📈 Progress: ${pixelsInserted} / ${TOTAL_PIXELS} pixels`);
          }

          // If more batches remain, insert next batch
          if (endPixel < TOTAL_PIXELS) {
            insertBatch(batchNumber + 1);
          } else {
            // All pixels inserted successfully
            console.log(`  ✅ All ${TOTAL_PIXELS} pixels inserted`);
            resolve();
          }
        }
      });
    };

    // Start with batch 0
    insertBatch(0);
  });
};

// ==================== QUERY HELPER FUNCTIONS ====================

/**
 * Function: runQuery(sql, params)
 * Purpose: Execute SQL INSERT, UPDATE, or DELETE
 * 
 * Parameters:
 * - sql: SQL statement string
 * - params: Array of values to bind to ? placeholders
 * 
 * Returns: Promise with result
 */
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

/**
 * Function: getQuery(sql, params)
 * Purpose: Execute SQL SELECT for a single row
 * 
 * Returns: Promise with single row object or null
 */
const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Function: allQuery(sql, params)
 * Purpose: Execute SQL SELECT for multiple rows
 * 
 * Returns: Promise with array of row objects
 */
const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// ==================== EXPORTS ====================
// Make functions available to other modules
module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery
};
