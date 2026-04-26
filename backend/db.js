/**
 * DATABASE MODULE - MySQL VERSION
 * 
 * This file handles all MySQL database operations for uminion_shared schema.
 * Upgraded from SQLite to MySQL for remote database access.
 * 
 * Key responsibilities:
 * 1. Connect to remote MySQL database
 * 2. Create/initialize uminion_shared schema and tables
 * 3. Provide query functions for other modules
 * 
 * ===== WHAT CHANGED =====
 * REMOVED: SQLite connection (sqlite3 library)
 * CHANGED: Database to remote MySQL (mysql2/promise)
 * CHANGED: All queries to use async/await with MySQL syntax
 * ADDED: webhook_logs table for backup logging
 * ADDED: Connection pooling for better performance
 * ADDED: Schema creation (uminion_shared)
 */

const mysql = require('mysql2/promise');

// ==================== DATABASE CONNECTION ====================
// This creates a connection pool that reuses connections
let pool;

const initializePool = async () => {
  try {
    // Create connection pool to remote MySQL server
    pool = mysql.createPool({
      host: process.env.DB_HOST,           // Remote MySQL server IP/hostname
      user: process.env.DB_USER,           // MySQL username
      password: process.env.DB_PASSWORD,   // MySQL password
      database: process.env.DB_NAME,       // Database name (uminion_shared)
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Connected to Remote MySQL database');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    // Initialize all tables in the schema
    await initializeDatabase();
    
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    // Retry connection after 5 seconds
    setTimeout(initializePool, 5000);
  }
};

// ==================== DATABASE INITIALIZATION ====================
/**
 * Function: initializeDatabase()
 * Purpose: Create all required tables in uminion_shared schema if they don't exist
 * 
 * Tables created:
 * 1. users - Store page005 user accounts
 * 2. pixels - Store pixel data (1,000,000 pixels)
 * 3. pixel_history - Track every color change to each pixel
 * 4. user_tickets - Track user ticket inventory
 * 5. ticket_purchases - Track ticket purchase transactions
 * 6. webhook_logs - NEW: Log all webhook fires for debugging
 * 
 * Returns: Promise that resolves when all tables are created
 */
const initializeDatabase = async () => {
  const connection = await pool.getConnection();
  
  try {
    // ---- TABLE 1: USERS ----
    // Stores page005 user account information (NOT page001's users)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // ---- TABLE 2: PIXELS ----
    // Stores data for each of the 1,000,000 pixels
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pixels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        x INT NOT NULL,
        y INT NOT NULL,
        color VARCHAR(7) DEFAULT '#FFFFFF',
        change_count INT DEFAULT 0,
        next_cost_tickets INT DEFAULT 1,
        last_changed_by INT,
        last_changed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pixel (x, y),
        FOREIGN KEY(last_changed_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Pixels table ready');

    // ---- TABLE 3: PIXEL_HISTORY ----
    // Tracks EVERY color change to every pixel
    // Allows showing "Page 1" through "Page 10" views
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pixel_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pixel_x INT NOT NULL,
        pixel_y INT NOT NULL,
        change_number INT NOT NULL,
        color VARCHAR(7) NOT NULL,
        changed_by_user_id INT NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(changed_by_user_id) REFERENCES users(id),
        UNIQUE KEY unique_history (pixel_x, pixel_y, change_number)
      )
    `);
    console.log('✅ Pixel History table ready');

    // ---- TABLE 4: USER_TICKETS ----
    // Tracks how many colored tickets each user has
    // Each column = one ticket type
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        blackTickets INT DEFAULT 0,
        purpleTickets INT DEFAULT 0,
        emeraldTickets INT DEFAULT 0,
        rubyTickets INT DEFAULT 0,
        sapphireTickets INT DEFAULT 0,
        silverTickets INT DEFAULT 0,
        goldTickets INT DEFAULT 0,
        diamondTickets INT DEFAULT 0,
        doublediamondTickets INT DEFAULT 0,
        total_pixeltickets INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ User Tickets table ready');

    // ---- TABLE 5: TICKET_PURCHASES ----
    // Tracks every ticket purchase transaction from WooCommerce
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ticket_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ticket_type VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        total_cost_cents INT NOT NULL,
        stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Ticket Purchases table ready');

    // ---- TABLE 6: WEBHOOK_LOGS (NEW) ----
    // Backup log of all webhook fires for debugging
    // If user says they bought something, check this table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        webhook_signature_valid BOOLEAN DEFAULT false,
        order_status VARCHAR(50),
        line_items_json LONGTEXT,
        user_id INT,
        user_found BOOLEAN DEFAULT false,
        processing_status VARCHAR(50) DEFAULT 'pending',
        items_processed INT DEFAULT 0,
        error_message LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Webhook Logs table ready');

    // Check if pixels table is empty, if so, populate it
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM pixels');
    
    if (rows[0].count === 0) {
      console.log('📊 Populating 1,000,000 pixels... This may take a moment...');
      await populatePixels(connection);
      console.log('✅ All 1,000,000 pixels created');
    } else {
      console.log(`✅ Pixels table has ${rows[0].count} pixels`);
    }

  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    throw err;
  } finally {
    connection.release();
  }
};

// ==================== PIXEL POPULATION ====================
/**
 * Function: populatePixels(connection)
 * Purpose: Insert all 1,000,000 pixels into database
 * 
 * Algorithm:
 * 1. Create 1,000 batches of 1,000 pixels each
 * 2. Insert each batch (faster than individual inserts)
 * 3. Track progress every 100 batches
 * 
 * Returns: Promise that resolves when complete
 */
const populatePixels = async (connection) => {
  const BATCH_SIZE = 1000;
  const TOTAL_PIXELS = 1000000;
  const GRID_SIZE = 1000;

  for (let batchNumber = 0; batchNumber * BATCH_SIZE < TOTAL_PIXELS; batchNumber++) {
    const startPixel = batchNumber * BATCH_SIZE;
    const endPixel = Math.min(startPixel + BATCH_SIZE, TOTAL_PIXELS);

    let values = [];
    for (let i = startPixel; i < endPixel; i++) {
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE);
      values.push([x, y]);
    }

    await connection.query('INSERT INTO pixels (x, y) VALUES ?', [values]);

    if (batchNumber % 100 === 0) {
      console.log(`  📈 Progress: ${endPixel} / ${TOTAL_PIXELS} pixels`);
    }
  }
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
 * Returns: Promise with result { id: insertId, changes: affectedRows }
 */
const runQuery = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return { id: result.insertId, changes: result.affectedRows };
  } finally {
    connection.release();
  }
};

/**
 * Function: getQuery(sql, params)
 * Purpose: Execute SQL SELECT for a single row
 * 
 * Returns: Promise with single row object or null if not found
 */
const getQuery = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows[0] || null;
  } finally {
    connection.release();
  }
};

/**
 * Function: allQuery(sql, params)
 * Purpose: Execute SQL SELECT for multiple rows
 * 
 * Returns: Promise with array of row objects
 */
const allQuery = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    connection.release();
  }
};

// ==================== USER HELPER FUNCTIONS ====================

/**
 * Function: getUserByEmail(email)
 * Purpose: Find user in uminion_shared.users by email address
 * 
 * IMPORTANT: This queries uminion_shared.users (page005 users only)
 * NOT page001's users table
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
 * If user has no row in user_tickets: INSERT new row
 * If user has existing row: UPDATE total_pixeltickets
 * 
 * Example: addTicketsToUser(5, 500) adds 500 PixelTickets to user 5
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
      'UPDATE user_tickets SET total_pixeltickets = ? WHERE user_id = ?',
      [newTotal, userId]
    );
  }

  console.log(`✅ Added ${totalPixelTickets} PixelTickets to user ${userId}`);
};

/**
 * Function: logWebhook(webhookData)
 * Purpose: Insert webhook fire into webhook_logs table for debugging
 * 
 * Returns: Promise with webhook log ID
 */
const logWebhook = async (webhookData) => {
  const result = await runQuery(`
    INSERT INTO webhook_logs (
      order_id,
      customer_email,
      webhook_signature_valid,
      order_status,
      line_items_json,
      processing_status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [
    webhookData.order_id,
    webhookData.customer_email,
    webhookData.signature_valid,
    webhookData.order_status,
    webhookData.line_items_json,
    'processing'
  ]);
  
  return result.id;
};

/**
 * Function: updateWebhookLog(logId, updates)
 * Purpose: Update webhook log after processing
 * 
 * Returns: Promise that resolves when complete
 */
const updateWebhookLog = async (logId, updates) => {
  await runQuery(`
    UPDATE webhook_logs 
    SET user_id = ?, user_found = ?, items_processed = ?, processing_status = ?, error_message = ?
    WHERE id = ?
  `, [
    updates.user_id,
    updates.user_found,
    updates.items_processed,
    updates.processing_status,
    updates.error_message,
    logId
  ]);
};

// ==================== EXPORTS ====================
// Make functions available to other modules
module.exports = {
  initializePool,
  runQuery,
  getQuery,
  allQuery,
  getUserByEmail,
  addTicketsToUser,
  logWebhook,
  updateWebhookLog
};
