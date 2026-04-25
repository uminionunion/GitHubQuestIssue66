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
 * 
 * ===== CHANGES IN THIS VERSION =====
 * REMOVED: purchases table (no longer tracking individual pixel purchases)
 * ADDED: pixel_history table (tracks every color change)
 * ADDED: user_tickets table (tracks user ticket inventory)
 * ADDED: ticket_purchases table (tracks ticket transactions)
 * MODIFIED: pixels table (removed ownership columns, added change tracking)
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
 * 3. pixel_history - NEW: Track every color change to each pixel
 * 4. user_tickets - NEW: Track user ticket inventory
 * 5. ticket_purchases - NEW: Track ticket purchase transactions
 * 
 * Returns: Promise that resolves when all tables are created
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Begin transaction (faster for bulk operations)
    db.serialize(() => {
      // ---- TABLE 1: USERS ----
      // Stores user account information
      // NO CHANGES from previous version
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
      // 
      // CHANGES FROM OLD VERSION:
      // REMOVED columns:
      //   - current_price (no longer needed, pixels not owned)
      //   - purchase_count (no longer needed)
      //   - owner_user_id (no longer needed, pixels not owned)
      //   - color_changes_available (no longer needed)
      // 
      // ADDED columns:
      //   - change_count (how many times this pixel has been changed: 0-10)
      //   - next_cost_tickets (cost in PixelTickets for next change)
      //   - last_changed_by (user_id of who changed it most recently)
      //   - last_changed_at (timestamp of last change)
      db.run(`
        CREATE TABLE IF NOT EXISTS pixels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          change_count INTEGER DEFAULT 0,
          next_cost_tickets INTEGER DEFAULT 1,
          last_changed_by INTEGER,
          last_changed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(x, y),
          FOREIGN KEY(last_changed_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating pixels table:', err);
          reject(err);
        } else {
          console.log('✅ Pixels table ready');
        }
      });

      // ---- TABLE 3: PIXEL_HISTORY (NEW) ----
      // Tracks EVERY color change to every pixel
      // 
      // This allows us to:
      // 1. Show "Page 1" through "Page 10" views
      // 2. See who changed each pixel and when
      // 3. Replay pixel evolution
      // 
      // Example rows:
      // pixel (5,5) change #1: red, user_123, 2024-01-01 10:00 AM
      // pixel (5,5) change #2: blue, user_456, 2024-01-01 02:30 PM
      // pixel (5,5) change #3: green, user_789, 2024-01-02 11:15 AM
      db.run(`
        CREATE TABLE IF NOT EXISTS pixel_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pixel_x INTEGER NOT NULL,
          pixel_y INTEGER NOT NULL,
          change_number INTEGER NOT NULL,
          color TEXT NOT NULL,
          changed_by_user_id INTEGER NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(changed_by_user_id) REFERENCES users(id),
          UNIQUE(pixel_x, pixel_y, change_number)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating pixel_history table:', err);
          reject(err);
        } else {
          console.log('✅ Pixel History table ready');
        }
      });

      // ---- TABLE 4: USER_TICKETS (NEW) ----
      // Tracks how many tickets each user has
      // 
      // Each column represents a different colored ticket type:
      // - blackTickets: 1 PixelTicket each
      // - purpleTickets: 5 PixelTickets each
      // - emeraldTickets: 10 PixelTickets each
      // - rubyTickets: 25 PixelTickets each
      // - sapphireTickets: 50 PixelTickets each
      // - silverTickets: 100 PixelTickets each
      // - goldTickets: 250 PixelTickets each
      // - diamondTickets: 500 PixelTickets each
      // - doublediamondTickets: 1,000 PixelTickets each
      // - total_pixeltickets: calculated sum (backend only)
      // 
      // Example row:
      // user_id: 1
      // blackTickets: 5 (= 5 PixelTickets)
      // purpleTickets: 2 (= 10 PixelTickets)
      // total_pixeltickets: 15 (5 + 10)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          blackTickets INTEGER DEFAULT 0,
          purpleTickets INTEGER DEFAULT 0,
          emeraldTickets INTEGER DEFAULT 0,
          rubyTickets INTEGER DEFAULT 0,
          sapphireTickets INTEGER DEFAULT 0,
          silverTickets INTEGER DEFAULT 0,
          goldTickets INTEGER DEFAULT 0,
          diamondTickets INTEGER DEFAULT 0,
          doublediamondTickets INTEGER DEFAULT 0,
          total_pixeltickets INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating user_tickets table:', err);
          reject(err);
        } else {
          console.log('✅ User Tickets table ready');
        }
      });

      // ---- TABLE 5: TICKET_PURCHASES (NEW) ----
      // Tracks every ticket purchase transaction
      // 
      // Used for:
      // 1. Payment verification (webhook confirmation)
      // 2. Transaction history
      // 3. Debugging failed payments
      // 
      // Example row:
      // user_id: 1
      // ticket_type: 'diamondTicket'
      // quantity: 1
      // total_cost_dollars: 1000 (in cents, so 100000)
      // stripe_session_id: 'cs_live_a1b2c3d4e5f6...'
      // status: 'completed'
      db.run(`
        CREATE TABLE IF NOT EXISTS ticket_purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          ticket_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          total_cost_cents INTEGER NOT NULL,
          stripe_session_id TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('❌ Error creating ticket_purchases table:', err);
          reject(err);
        } else {
          console.log('✅ Ticket Purchases table ready');
        }
      });

      // ---- NOTE: OLD PURCHASES TABLE NO LONGER USED ----
      // The old "purchases" table tracked individual pixel purchases
      // We no longer need this since pixels aren't owned anymore
      // You can optionally delete it from the database manually:
      // DROP TABLE IF EXISTS purchases;
      // But it won't hurt to leave it there (it will just be unused)

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
 * Example:
 * await runQuery(
 *   'UPDATE user_tickets SET total_pixeltickets = ? WHERE user_id = ?',
 *   [1000, 5]
 * )
 * 
 * Returns: Promise with result { id: lastID, changes: number of rows changed }
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
 * Example:
 * const pixel = await getQuery(
 *   'SELECT * FROM pixels WHERE x = ? AND y = ?',
 *   [5, 10]
 * )
 * 
 * Returns: Promise with single row object or null if not found
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
 * Example:
 * const userPixels = await allQuery(
 *   'SELECT * FROM pixel_history WHERE pixel_x = ? AND pixel_y = ?',
 *   [5, 10]
 * )
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









// ==================== USER HELPER FUNCTIONS ====================

/**
 * Function: getUserByEmail(email)
 * Purpose: Find user by email address
 * 
 * Returns: Promise with user object { id, email, password_hash, created_at }
 */
const getUserByEmail = (email) => {
  return getQuery('SELECT * FROM users WHERE email = ?', [email]);
};

/**
 * Function: addTicketsToUser(userId, totalPixelTickets)
 * Purpose: Add pixel tickets to user's inventory
 * 
 * This function:
 * 1. Gets user's current ticket inventory
 * 2. Adds the new tickets to total_pixeltickets
 * 3. Updates the user_tickets table
 * 
 * Example: addTicketsToUser(5, 250) adds 250 pixel tickets to user 5
 * 
 * Returns: Promise that resolves when complete
 */
const addTicketsToUser = async (userId, totalPixelTickets) => {
  // Get user's current ticket row
  const userTickets = await getQuery(
    'SELECT * FROM user_tickets WHERE user_id = ?',
    [userId]
  );

  if (!userTickets) {
    // User has no ticket row yet, create one
    await runQuery(
      'INSERT INTO user_tickets (user_id, total_pixeltickets) VALUES (?, ?)',
      [userId, totalPixelTickets]
    );
  } else {
    // User has tickets, add to existing total
    const newTotal = (userTickets.total_pixeltickets || 0) + totalPixelTickets;
    await runQuery(
      'UPDATE user_tickets SET total_pixeltickets = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [newTotal, userId]
    );
  }

  console.log(`✅ Added ${totalPixelTickets} tickets to user ${userId}`);
};





// ==================== EXPORTS ====================
// Make functions available to other modules
module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery,
  getUserByEmail,
  addTicketsToUser
};
