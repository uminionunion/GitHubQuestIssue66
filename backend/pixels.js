/**
 * PIXELS MODULE
 * 
 * This file handles all pixel-related operations:
 * 1. Get pixel data
 * 2. Change pixel colors (new, uses tickets)
 * 3. Get pixel history for timeline pages
 * 4. Manage pixel change tracking
 * 
 * ===== CHANGES IN THIS VERSION =====
 * REMOVED: updatePixelColor() (old version that checked ownership)
 * REMOVED: createCheckoutSession() (pixel purchases no longer exist)
 * REMOVED: calculateNextPrice() (no longer needed)
 * ADDED: changePixelColor() (new version that uses PixelTickets)
 * ADDED: calculatePixelCost() (calculate ticket cost based on change number)
 * ADDED: getPixelHistory() (get color change history for a pixel)
 * ADDED: getHistoryPagePixels() (get all pixels at a specific page/change number)
 */

const { getQuery, allQuery, runQuery } = require('./db');

// ==================== PIXEL RETRIEVAL ====================

/**
 * Function: getAllPixels(start, limit)
 * Purpose: Fetch pixels with optional pagination
 * 
 * Parameters:
 * - start: Starting index (default 0)
 * - limit: Number of pixels to return (default 1000, max 1000)
 * 
 * Returns: Array of pixel objects
 */
const getAllPixels = async (start = 0, limit = 1000) => {
  try {
    // Validate parameters
    start = Math.max(0, parseInt(start) || 0);
    limit = Math.min(1000, Math.max(1, parseInt(limit) || 1000)); // Max 1000 per request

    const pixels = await allQuery(
      `SELECT 
        id, 
        x, 
        y, 
        color, 
        change_count,
        next_cost_tickets,
        last_changed_by
      FROM pixels
      ORDER BY id ASC
      LIMIT ? OFFSET ?`,
      [limit, start]
    );

    return pixels;
  } catch (err) {
    throw new Error('Failed to fetch pixels: ' + err.message);
  }
};

/**
 * Function: getPixel(x, y)
 * Purpose: Get data for a specific pixel
 * 
 * Returns:
 * {
 *   id: 1234,
 *   x: 5,
 *   y: 10,
 *   color: '#FF0000',
 *   change_count: 3,          // How many times changed (0-10)
 *   next_cost_tickets: 8,     // Cost in PixelTickets for next change
 *   last_changed_by: 42       // user_id of last person who changed it
 * }
 * 
 * Parameters:
 * - x: x coordinate (0-999)
 * - y: y coordinate (0-999)
 * 
 * Returns: Pixel object with all info
 */
const getPixel = async (x, y) => {
  try {
    // Validate coordinates
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) {
      throw new Error('Invalid pixel coordinates');
    }

    const pixel = await getQuery(
      `SELECT * FROM pixels WHERE x = ? AND y = ?`,
      [x, y]
    );

    if (!pixel) {
      throw new Error('Pixel not found');
    }

    return pixel;
  } catch (err) {
    throw new Error('Failed to fetch pixel: ' + err.message);
  }
};

// ==================== PIXEL COLOR CHANGE (NEW SYSTEM) ====================

/**
 * Function: changePixelColor(x, y, userId, newColor)
 * Purpose: Change a pixel's color using PixelTickets
 * 
 * Process:
 * 1. Verify pixel exists
 * 2. Calculate cost based on how many times it's been changed
 * 3. Check user has enough PixelTickets in their inventory
 * 4. Deduct tickets from user's total
 * 5. Record change in pixel_history
 * 6. Update pixel's color and metadata
 * 
 * Parameters:
 * - x: pixel x coordinate
 * - y: pixel y coordinate
 * - userId: user_id making the change
 * - newColor: hex color like "#FF0000"
 * 
 * Returns: Updated pixel object
 * 
 * Throws errors if:
 * - Pixel not found
 * - Invalid color format
 * - Max changes reached (10)
 * - User doesn't have enough PixelTickets
 */
const changePixelColor = async (x, y, userId, newColor) => {
  try {
    // ---- VALIDATION ----
    // Check color format (must be valid hex)
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (!hexRegex.test(newColor)) {
      throw new Error('Invalid hex color format. Use #RRGGBB');
    }

    // ---- GET PIXEL DATA ----
    const pixel = await getQuery(
      `SELECT * FROM pixels WHERE x = ? AND y = ?`,
      [x, y]
    );

    if (!pixel) {
      throw new Error('Pixel not found');
    }

    // ---- CHECK IF MAX CHANGES REACHED ----
    // Max 10 changes per pixel (change_count goes 0-9, then it's at max)
    if (pixel.change_count >= 10) {
      throw new Error('This pixel has reached maximum changes (10). Cannot change anymore.');
    }

    // ---- CALCULATE COST ----
    // Next change number will be change_count + 1
    const nextChangeNumber = pixel.change_count + 1;
    const costInPixelTickets = calculatePixelCost(nextChangeNumber);

    // ---- GET USER'S TICKET INVENTORY ----
    const userTickets = await getQuery(
      `SELECT * FROM user_tickets WHERE user_id = ?`,
      [userId]
    );

    // If user has no tickets, set total to 0
    const userTotalTickets = userTickets ? userTickets.total_pixeltickets : 0;

    // ---- CHECK IF USER HAS ENOUGH TICKETS ----
    if (userTotalTickets < costInPixelTickets) {
      // Not enough tickets - return error with shortage info
      const shortage = costInPixelTickets - userTotalTickets;
      throw new Error(
        `Insufficient PixelTickets. Need ${costInPixelTickets}, have ${userTotalTickets}, shortage: ${shortage}`
      );
    }

    // ---- DEDUCT TICKETS FROM USER ----
    const newTotal = userTotalTickets - costInPixelTickets;
    await runQuery(
      `UPDATE user_tickets 
       SET total_pixeltickets = ?
       WHERE user_id = ?`,
      [newTotal, userId]
    );

    // ---- RECORD IN PIXEL_HISTORY ----
    // This is how we track pixel evolution for pages 1-10
    await runQuery(
      `INSERT INTO pixel_history 
       (pixel_x, pixel_y, change_number, color, changed_by_user_id, changed_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [x, y, nextChangeNumber, newColor, userId]
    );

    // ---- UPDATE PIXEL ----
    // Set new color, increment change_count, update cost for next change
    const nextCostTickets = calculatePixelCost(nextChangeNumber + 1);
    
    await runQuery(
      `UPDATE pixels 
       SET color = ?, 
           change_count = ?,
           next_cost_tickets = ?,
           last_changed_by = ?,
           last_changed_at = datetime('now')
       WHERE x = ? AND y = ?`,
      [newColor, nextChangeNumber, nextCostTickets, userId, x, y]
    );

    // ---- RETURN UPDATED PIXEL ----
    const updatedPixel = await getQuery(
      `SELECT * FROM pixels WHERE x = ? AND y = ?`,
      [x, y]
    );

    return {
      success: true,
      pixel: updatedPixel,
      newUserTotalTickets: newTotal,
      costUsed: costInPixelTickets
    };
  } catch (err) {
    throw new Error('Failed to change pixel color: ' + err.message);
  }
};

// ==================== PIXEL COST CALCULATION (NEW) ====================

/**
 * Function: calculatePixelCost(changeNumber)
 * Purpose: Calculate how many PixelTickets a change costs
 * 
 * Formula: 2^(changeNumber - 1)
 * 
 * Examples:
 * changeNumber 1 (1st change): 2^0 = 1 PixelTicket
 * changeNumber 2 (2nd change): 2^1 = 2 PixelTickets
 * changeNumber 3 (3rd change): 2^2 = 4 PixelTickets
 * changeNumber 4 (4th change): 2^3 = 8 PixelTickets
 * changeNumber 5 (5th change): 2^4 = 16 PixelTickets
 * ...
 * changeNumber 10 (10th change): 2^9 = 512 PixelTickets
 * 
 * Parameters:
 * - changeNumber: Which change this is (1-10)
 * 
 * Returns: Cost in PixelTickets (integer)
 * 
 * Throws error if changeNumber > 10 (max changes exceeded)
 */
const calculatePixelCost = (changeNumber) => {
  // Validate change number
  if (changeNumber < 1 || changeNumber > 10) {
    throw new Error(`Invalid change number. Must be 1-10, got ${changeNumber}`);
  }

  // Calculate: 2^(changeNumber - 1)
  const cost = Math.pow(2, changeNumber - 1);
  
  return cost;
};

// ==================== PIXEL HISTORY (NEW) ====================

/**
 * Function: getPixelHistory(x, y)
 * Purpose: Get the complete change history for a single pixel
 * 
 * Returns all changes in order, like:
 * [
 *   {
 *     change_number: 1,
 *     color: '#FF0000',
 *     changed_by_user_id: 123,
 *     changed_at: '2024-01-01 10:00:00'
 *   },
 *   {
 *     change_number: 2,
 *     color: '#00FF00',
 *     changed_by_user_id: 456,
 *     changed_at: '2024-01-01 02:30:00'
 *   },
 *   ...
 * ]
 * 
 * Parameters:
 * - x: pixel x coordinate
 * - y: pixel y coordinate
 * 
 * Returns: Array of history records (may be empty if never changed)
 */
const getPixelHistory = async (x, y) => {
  try {
    const history = await allQuery(
      `SELECT 
        change_number,
        color,
        changed_by_user_id,
        changed_at
       FROM pixel_history
       WHERE pixel_x = ? AND pixel_y = ?
       ORDER BY change_number ASC`,
      [x, y]
    );

    return history || [];
  } catch (err) {
    throw new Error('Failed to fetch pixel history: ' + err.message);
  }
};

/**
 * Function: getHistoryPagePixels(pageNumber)
 * Purpose: Get ALL pixels showing their state at a specific change number
 * 
 * This is used for the history pages (1-10) feature.
 * When user clicks "Page 5", we show all pixels with their color
 * from change #5 (or their latest change if < 5)
 * 
 * Algorithm:
 * 1. For each pixel, check if it has a change at this page number
 * 2. If YES: return the color from that change
 * 3. If NO: return the latest change color before this page
 * 4. If NEVER: return white (default)
 * 
 * Parameters:
 * - pageNumber: Which change number to show (1-10)
 * 
 * Returns: Array of all pixels with their color at that change number
 * 
 * Example:
 * getHistoryPagePixels(3) returns all pixels showing their state
 * from change #3 (or latest if only changed 1-2 times)
 */
const getHistoryPagePixels = async (pageNumber) => {
  try {
    // Validate page number
    if (pageNumber < 1 || pageNumber > 10) {
      throw new Error('Invalid page number. Must be 1-10');
    }

    // SQL Query explanation:
    // For each pixel, find the color from change #pageNumber
    // If no change at that number, find the most recent change BEFORE that number
    // If no changes at all, use white
    const pixels = await allQuery(
      `SELECT 
        p.id,
        p.x,
        p.y,
        COALESCE(
          -- First, try to find change at exactly this page number
          (SELECT color FROM pixel_history 
           WHERE pixel_x = p.x AND pixel_y = p.y AND change_number = ?
           LIMIT 1),
          -- If not found, get most recent change before this page number
          (SELECT color FROM pixel_history 
           WHERE pixel_x = p.x AND pixel_y = p.y AND change_number < ?
           ORDER BY change_number DESC
           LIMIT 1),
          -- If still no change, use white (default)
          '#FFFFFF'
        ) as color,
        p.change_count,
        p.last_changed_by
       FROM pixels p
       ORDER BY p.id ASC`,
      [pageNumber, pageNumber]
    );

    return pixels;
  } catch (err) {
    throw new Error('Failed to fetch history page pixels: ' + err.message);
  }
};

// ==================== EXPORTS ====================
module.exports = {
  getAllPixels,
  getPixel,
  changePixelColor,
  calculatePixelCost,
  getPixelHistory,
  getHistoryPagePixels
};
