/**
 * STRIPE WEBHOOK MODULE
 * 
 * This file handles webhooks from Stripe.
 * 
 * What's a webhook?
 * - Stripe sends HTTP POST requests to our server when payments succeed
 * - We verify the request came from Stripe (using signature verification)
 * - We then update the database to give user tickets
 * 
 * Why webhooks?
 * - Payment might succeed but user's browser crashes
 * - Webhook ensures we always process the payment
 * - Webhook is more secure (happens on server, not client)
 * 
 * ===== CHANGES IN THIS VERSION =====
 * OLD: Payment → increment pixel purchase_count, double price, set owner
 * NEW: Payment → add tickets to user's inventory
 * 
 * Flow:
 * 1. User completes payment on Stripe for tickets
 * 2. Stripe sends webhook to /api/webhook/stripe
 * 3. We verify signature (ensure it's really from Stripe)
 * 4. Extract ticket metadata from payment
 * 5. Add tickets to user's inventory in user_tickets table
 * 6. Update ticket_purchases status to 'completed'
 * 7. Send confirmation back to Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getQuery, runQuery } = require('./db');
const tickets = require('./tickets');

// ==================== WEBHOOK HANDLER ====================

/**
 * Function: handlePaymentSuccess(body, signature)
 * Purpose: Process successful Stripe payment webhook for ticket purchases
 * 
 * Steps:
 * 1. Verify webhook signature (ensure it's from Stripe)
 * 2. Extract event and metadata
 * 3. Validate user and ticket purchase
 * 4. Add tickets to user inventory
 * 5. Mark ticket purchase as completed
 * 6. Return confirmation
 * 
 * Parameters:
 * - body: Raw request body from Stripe
 * - signature: Signature header from Stripe
 * 
 * Returns: Promise that resolves when complete
 * 
 * Error handling:
 * - If webhook signature invalid: throw error
 * - If payment not completed: log and return (ignore)
 * - If user not found: throw error
 * - If ticket type invalid: throw error
 */
const handlePaymentSuccess = async (body, signature) => {
  try {
    // ---- VERIFY WEBHOOK SIGNATURE ----
    // This confirms the webhook really came from Stripe
    // If signature is invalid, someone is spoofing Stripe
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
    // We only care about successful checkout completions
    if (event.type !== 'checkout.session.completed') {
      console.log(`⏭️  Ignoring event type: ${event.type}`);
      return;
    }

    const session = event.data.object;

    // Check payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`⏭️  Payment not completed. Status: ${session.payment_status}`);
      return;
    }

    // ---- EXTRACT METADATA ----
    // Get ticket purchase info that was attached during checkout
    const { userId, ticketType, quantity, pixelTicketsTotal } = session.metadata;

    if (!userId || !ticketType || !quantity) {
      throw new Error('Missing required metadata in webhook');
    }

    console.log(`💰 Processing ticket purchase: User ${userId} bought ${quantity}x ${ticketType}`);

    // ---- VALIDATE USER EXISTS ----
    // Make sure the user still exists (they might have deleted account)
    const user = await getQuery(
      `SELECT id, email FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // ---- VALIDATE TICKET TYPE ----
    // Make sure the ticket type is real (prevent injection)
    try {
      tickets.validateTicketType(ticketType);
    } catch (err) {
      throw new Error(`Invalid ticket type: ${ticketType}`);
    }

    // ---- ADD TICKETS TO USER ----
    // This updates user_tickets table with new ticket counts
    const updatedInventory = await tickets.addTicketsToUser(
      parseInt(userId),
      ticketType,
      parseInt(quantity)
    );

    // ---- UPDATE TICKET_PURCHASES STATUS ----
    // Mark this purchase as completed (no longer pending)
    await runQuery(
      `UPDATE ticket_purchases 
       SET status = 'completed',
           completed_at = datetime('now')
       WHERE stripe_session_id = ?`,
      [session.id]
    );

    // ---- LOG SUCCESS ----
    console.log(`✅ Tickets added to user ${userId}`);
    console.log(`   - Ticket type: ${ticketType}`);
    console.log(`   - Quantity: ${quantity}`);
    console.log(`   - Total PixelTickets: ${pixelTicketsTotal}`);
    console.log(`   - User now has: ${updatedInventory.total_pixeltickets} total PixelTickets`);
    console.log(`   - Session ID: ${session.id}`);

  } catch (err) {
    console.error('❌ Webhook processing error:', err.message);
    throw err;
  }
};

// ==================== EXPORTS ====================
module.exports = {
  handlePaymentSuccess
};
