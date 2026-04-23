/**
 * PIXELS MODULE
 * 
 * This file handles all pixel-related operations:
 * 1. Get pixel data
 * 2. Update pixel colors
 * 3. Create Stripe checkout sessions
 * 4. Manage pixel ownership
 * 
 * Key concepts:
 * - Each pixel starts at $2 and doubles after each purchase
 * - Max 10 purchases per pixel
 * - Each purchase allows 1 color change
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getQuery, allQuery, runQuery } = require('./db');

// ==================== PIXEL RETRIEVAL ====================

/**
 * Function: getAllPixels()
 * Purpose: Fetch all 1,000,000 pixels from database
 * 
 * Performance consideration:
 * - Returning all pixels as-is would be huge JSON
 * - In production, you might compress or paginate this
 * - For now, we return everything for frontend canvas rendering
 * 
 * Returns: Array of pixel objects
 */
const getAllPixels = async () => {
  try {
    const pixels = await allQuery(
      `SELECT 
        id, 
        x, 
        y, 
        color, 
        current_price, 
        purchase_count, 
        owner_user_id 
      FROM pixels
      ORDER BY id ASC`
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

// ==================== USER PIXEL MANAGEMENT ====================

/**
 * Function: getUserPixels(userId)
 * Purpose: Get all pixels owned by a specific user
 * 
 * Used in user dashboard to show:
 * - All pixels they've purchased
 * - Current color of each
 * - How many color changes they have left
 * 
 * Returns: Array of pixel objects owned by user
 */
const getUserPixels = async (userId) => {
  try {
    const pixels = await allQuery(
      `SELECT 
        id,
        x,
        y,
        color,
        current_price,
        purchase_count,
        color_changes_available
      FROM pixels
      WHERE owner_user_id = ?
      ORDER BY y ASC, x ASC`,
      [userId]
    );

    return pixels;
  } catch (err) {
    throw new Error('Failed to fetch user pixels: ' + err.message);
  }
};

// ==================== COLOR MANAGEMENT ====================

/**
 * Function: updatePixelColor(pixelId, userId, color)
 * Purpose: Change a pixel's color
 * 
 * Rules:
 * - User must own the pixel
 * - User must have color changes available
 * - Color must be valid hex format
 * 
 * Parameters:
 * - pixelId: ID of pixel to update
 * - userId: ID of user attempting update
 * - color: Hex color string (e.g., "#FFFFFF")
 * 
 * Returns: Updated pixel object
 */
const updatePixelColor = async (pixelId, userId, color) => {
  try {
    // ---- VALIDATION ----
    // Check color format (must be valid hex)
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (!hexRegex.test(color)) {
      throw new Error('Invalid hex color format. Use #RRGGBB');
    }

    // ---- VERIFY OWNERSHIP ----
    // Get pixel data
    const pixel = await getQuery(
      'SELECT * FROM pixels WHERE id = ?',
      [pixelId]
    );

    if (!pixel) {
      throw new Error('Pixel not found');
    }

    // Check if user owns this pixel
    if (pixel.owner_user_id !== userId) {
      throw new Error('You do not own this pixel');
    }

    // ---- CHECK COLOR CHANGES AVAILABLE ----
    // User gets 1 color change per purchase
    if (pixel.color_changes_available <= 0) {
      throw new Error('No color changes available. Purchase again to get more.');
    }

    // ---- UPDATE COLOR ----
    // Set new color and decrement available changes
    await runQuery(
      `UPDATE pixels 
       SET color = ?, 
           color_changes_available = color_changes_available - 1
       WHERE id = ?`,
      [color, pixelId]
    );

    // ---- RETURN UPDATED PIXEL ----
    const updatedPixel = await getQuery(
      'SELECT * FROM pixels WHERE id = ?',
      [pixelId]
    );

    return updatedPixel;
  } catch (err) {
    throw new Error('Failed to update pixel color: ' + err.message);
  }
};

// ==================== STRIPE CHECKOUT ====================

/**
 * Function: createCheckoutSession(pixelId, userId, price, purchase_count, x, y)
 * Purpose: Create Stripe checkout session for pixel purchase
 * 
 * This integrates with Stripe to:
 * 1. Create a checkout session
 * 2. Store pixel metadata
 * 3. Return session ID to frontend
 * 4. Frontend redirects to Stripe checkout
 * 
 * Parameters:
 * - pixelId: ID of pixel being purchased
 * - userId: ID of user making purchase
 * - price: Price in cents (e.g., 200 = $2.00)
 * - purchase_count: Current purchase count
 * - x, y: Pixel coordinates
 * 
 * Returns: Stripe session object
 */
const createCheckoutSession = async (pixelId, userId, price, purchase_count, x, y) => {
  try {
    // ---- VALIDATION ----
    // Check purchase limit
    if (purchase_count >= 10) {
      throw new Error('This pixel has reached maximum purchases (10)');
    }

    // Check price is reasonable (between $2 and $2048 = 2^10 * 2)
    const maxPrice = 2 * Math.pow(2, 10) * 100; // in cents
    if (price < 200 || price > maxPrice) {
      throw new Error('Invalid price');
    }

    // ---- CREATE STRIPE SESSION ----
    // This creates a checkout session that will handle payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      
      // The product being purchased
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Million Pixel Grid - Pixel (${x}, ${y})`,
              description: `Purchase pixel at coordinates (${x}, ${y}). Purchase #${purchase_count + 1}`,
              images: [] // Could add preview image here
            },
            unit_amount: price // Amount in cents
          },
          quantity: 1
        }
      ],

      // Success/Cancel URLs
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,

      // IMPORTANT: Metadata is passed to webhook
      // After payment, webhook will use this to update database
      metadata: {
        pixelId: pixelId.toString(),
        userId: userId.toString(),
        x: x.toString(),
        y: y.toString(),
        purchase_count: purchase_count.toString(),
        price: price.toString()
      }
    });

    return session;
  } catch (err) {
    throw new Error('Failed to create checkout session: ' + err.message);
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Function: calculateNextPrice(currentPurchaseCount)
 * Purpose: Calculate what price a pixel should be after this purchase
 * 
 * Price progression:
 * - Purchase 1: $2
 * - Purchase 2: $4
 * - Purchase 3: $8
 * - Purchase 4: $16
 * - ... up to purchase 10: $1024
 * 
 * Formula: 2 * (2 ^ purchaseCount)
 * 
 * Parameters: currentPurchaseCount (0-9)
 * Returns: Price in cents
 */
const calculateNextPrice = (currentPurchaseCount) => {
  // Check if already at max
  if (currentPurchaseCount >= 10) {
    return null; // Can't purchase anymore
  }

  // Calculate: $2 * 2^purchaseCount, convert to cents
  const priceInDollars = 2 * Math.pow(2, currentPurchaseCount);
  return Math.round(priceInDollars * 100); // Convert to cents
};

// ==================== EXPORTS ====================
module.exports = {
  getAllPixels,
  getPixel,
  getUserPixels,
  updatePixelColor,
  createCheckoutSession,
  calculateNextPrice
};
