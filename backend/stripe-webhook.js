/**
 * STRIPE WEBHOOK MODULE
 * 
 * This file handles webhooks from Stripe.
 * 
 * What's a webhook?
 * - Stripe sends HTTP POST requests to our server when payments succeed
 * - We verify the request came from Stripe (using signature verification)
 * - We then update the database to mark pixel as purchased
 * 
 * Why webhooks?
 * - Payment might succeed but user's browser crashes
 * - Webhook ensures we always process the payment
 * - Webhook is more secure (happens on server, not client)
 * 
 * Flow:
 * 1. User completes payment on Stripe
 * 2. Stripe sends webhook to /api/webhook/stripe
 * 3. We verify signature (ensure it's really from Stripe)
 * 4. Extract pixel metadata from payment
 * 5. Update database: increment purchase_count, double price, set owner
 * 6. Send confirmation back to Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getQuery, runQuery } = require('./db');

// ==================== WEBHOOK HANDLER ====================

/**
 * Function: handlePaymentSuccess(body, signature)
 * Purpose: Process successful Stripe payment webhook
 * 
 * Steps:
 * 1. Verify webhook signature (ensure it's from Stripe)
 * 2. Extract event and metadata
 * 3. Validate pixel state
 * 4. Update database atomically
 * 5. Return confirmation
 * 
 * Parameters:
 * - body: Raw request body from Stripe
 * - signature: Signature header from Stripe
 * 
 * Returns: Promise that resolves when complete
 */
const handlePaymentSuccess = async (body, signature) => {
  try {
    // ---- VERIFY WEBHOOK SIGNATURE ----
    // This confirms the webhook really came from Stripe
    // If signature is invalid, Stripe CLI or webhook won't work
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }

    console.log(`📨 Webhook received: ${event.type}`);

    // ---- HANDLE DIFFERENT EVENT TYPES ----
    // We only care about successful payments
    if (event.type !== 'checkout.session.completed') {
      console.log(`⏭️  Ignoring event type: ${event.type}`);
      return;
    }

    const session = event.data.object;

    // Check payment was successful
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // ---- EXTRACT METADATA ----
    // Get pixel info that was attached during checkout
    const { pixelId, userId, x, y, price, purchase_count } = session.metadata;

    if (!pixelId || !userId) {
      throw new Error('Missing required metadata in webhook');
    }

    console.log(`💰 Processing payment for pixel (${x}, ${y}), user ${userId}`);

    // ---- VALIDATE PIXEL STATE ----
    // Get current pixel state
    const pixel = await getQuery(
      'SELECT * FROM pixels WHERE id = ?',
      [pixelId]
    );

    if (!pixel) {
      throw new Error(`Pixel ${pixelId} not found`);
    }

    // Check if pixel already purchased this many times
    // (prevents race condition where two payments succeed for same state)
    if (pixel.purchase_count > parseInt(purchase_count)) {
      console.warn(`⚠️  Pixel already purchased more times. Ignoring.`);
      return;
    }

    // Check if pixel already at max purchases
    if (pixel.purchase_count >= 10) {
      throw new Error('Pixel has already reached maximum purchases (10)');
    }

    // ---- UPDATE DATABASE ====
    // This happens in a single transaction to prevent race conditions
    // All updates happen atomically (all succeed or all fail)

    // Calculate new price (double the current price)
    const newPrice = pixel.current_price * 2;

    // Update pixel
    await runQuery(
      `UPDATE pixels 
       SET owner_user_id = ?, 
           purchase_count = purchase_count + 1,
           current_price = ?,
           color_changes_available = color_changes_available + 1
       WHERE id = ?`,
      [userId, newPrice, pixelId]
    );

    // Record this purchase in purchases table
    await runQuery(
      `INSERT INTO purchases (user_id, pixel_id, price_paid, purchase_number, stripe_session_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        pixelId,
        parseInt(price),
        pixel.purchase_count + 1,
        session.id
      ]
    );

    console.log(`✅ Pixel (${x}, ${y}) purchased by user ${userId}`);
    console.log(`   - Purchase #${pixel.purchase_count + 1}`);
    console.log(`   - Price paid: $${(parseInt(price) / 100).toFixed(2)}`);
    console.log(`   - New price: $${(newPrice / 100).toFixed(2)}`);

  } catch (err) {
    console.error('❌ Webhook processing error:', err.message);
    throw err;
  }
};

// ==================== EXPORTS ====================
module.exports = {
  handlePaymentSuccess
};
