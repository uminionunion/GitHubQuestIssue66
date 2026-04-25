/**
 * TICKETS MODULE
 * 
 * This file handles all ticket-related operations:
 * 1. Create Stripe checkout sessions for ticket purchases
 * 2. Calculate prices for ticket bundles
 * 3. Validate ticket amounts
 * 
 * Tickets are the new currency system:
 * - Users buy tickets instead of pixels
 * - Tickets are consumable (used up when changing pixels)
 * - 9 colored ticket types with different values
 * 
 * ===== NEW FILE =====
 * This file replaces the pixel purchase logic from pixels.js
 * Old: "Buy pixel at (5,5) for $2"
 * New: "Buy tickets to use for changing pixels"
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getQuery, runQuery } = require('./db');

// ==================== TICKET CONFIGURATION ====================

/**
 * This object defines all ticket types and their values
 * 
 * Each ticket has:
 * - name: Display name (used for data)
 * - displayName: Pretty name for frontend
 * - pixelTicketsValue: How many PixelTickets this represents
 * - priceInCents: Cost to buy 1 of this ticket (in cents, so divide by 100 for dollars)
 * - emoji: Icon to show in frontend
 * 
 * IMPORTANT: These values must match frontend exactly
 */
const TICKET_TYPES = {
  blackTicket: {
    name: 'blackTicket',
    displayName: 'Black Ticket',
    pixelTicketsValue: 1,
    priceInCents: 200,        // $2.00
    emoji: '🔵'
  },
  purpleTicket: {
    name: 'purpleTicket',
    displayName: 'Purple Ticket',
    pixelTicketsValue: 5,
    priceInCents: 1000,       // $10.00
    emoji: '🟣'
  },
  emeraldTicket: {
    name: 'emeraldTicket',
    displayName: 'Emerald Ticket',
    pixelTicketsValue: 10,
    priceInCents: 2000,       // $20.00
    emoji: '🟢'
  },
  rubyTicket: {
    name: 'rubyTicket',
    displayName: 'Ruby Ticket',
    pixelTicketsValue: 25,
    priceInCents: 5000,       // $50.00
    emoji: '🔴'
  },
  sapphireTicket: {
    name: 'sapphireTicket',
    displayName: 'Sapphire Ticket',
    pixelTicketsValue: 50,
    priceInCents: 10000,      // $100.00
    emoji: '🔵'
  },
  silverTicket: {
    name: 'silverTicket',
    displayName: 'Silver Ticket',
    pixelTicketsValue: 100,
    priceInCents: 20000,      // $200.00
    emoji: '⚪'
  },
  goldTicket: {
    name: 'goldTicket',
    displayName: 'Gold Ticket',
    pixelTicketsValue: 250,
    priceInCents: 50000,      // $500.00
    emoji: '🟡'
  },
  diamondTicket: {
    name: 'diamondTicket',
    displayName: 'Diamond Ticket',
    pixelTicketsValue: 500,
    priceInCents: 100000,     // $1,000.00
    emoji: '💎'
  },
  doublediamondTicket: {
    name: 'doublediamondTicket',
    displayName: 'Double Diamond Ticket',
    pixelTicketsValue: 1000,
    priceInCents: 200000,     // $2,000.00
    emoji: '💠'
  }
};

// ==================== TICKET VALIDATION ====================

/**
 * Function: validateTicketType(ticketType)
 * Purpose: Check if a ticket type exists in our system
 * 
 * Parameters:
 * - ticketType: String like 'diamondTicket'
 * 
 * Returns: true if valid, throws error if invalid
 */
const validateTicketType = (ticketType) => {
  if (!TICKET_TYPES[ticketType]) {
    const validTypes = Object.keys(TICKET_TYPES).join(', ');
    throw new Error(
      `Invalid ticket type: ${ticketType}. Must be one of: ${validTypes}`
    );
  }
  return true;
};

/**
 * Function: validateQuantity(quantity)
 * Purpose: Ensure quantity is a positive integer
 * 
 * Parameters:
 * - quantity: Number of tickets to buy
 * 
 * Returns: true if valid, throws error if invalid
 */
const validateQuantity = (quantity) => {
  const qty = parseInt(quantity);
  
  if (isNaN(qty) || qty < 1) {
    throw new Error('Quantity must be a positive integer');
  }
  
  if (qty > 100) {
    throw new Error('Cannot buy more than 100 of a single ticket type at once');
  }
  
  return true;
};

// ==================== STRIPE CHECKOUT ====================

/**
 * Function: createTicketCheckoutSession(userId, ticketType, quantity)
 * Purpose: Create Stripe checkout session for buying tickets
 * 
 * Process:
 * 1. Validate ticket type and quantity
 * 2. Look up user info
 * 3. Create pending ticket_purchases record
 * 4. Create Stripe checkout session with metadata
 * 5. Return session ID to frontend
 * 
 * Parameters:
 * - userId: User ID buying tickets
 * - ticketType: Which ticket type (e.g., 'diamondTicket')
 * - quantity: How many tickets (e.g., 1, 5, 10)
 * 
 * Returns: {
 *   success: true,
 *   sessionId: 'cs_live_a1b2c3d4...',
 *   price: 100000,          // in cents
 *   ticketType: 'diamondTicket',
 *   quantity: 1
 * }
 */
const createTicketCheckoutSession = async (userId, ticketType, quantity) => {
  try {
    // ---- VALIDATION ----
    validateTicketType(ticketType);
    validateQuantity(quantity);

    // Get ticket info
    const ticket = TICKET_TYPES[ticketType];
    
    // Calculate total price
    // Example: DiamondTicket costs 100000 cents, buy 2 = 200000 cents
    const totalPriceInCents = ticket.priceInCents * quantity;

    // ---- GET USER INFO ----
    // We need user email for Stripe customer identification
    const user = await getQuery(
      `SELECT id, email FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // ---- CREATE PENDING PURCHASE RECORD ----
    // We create a record with status 'pending' before Stripe payment
    // After webhook confirms payment, we'll update this to 'completed'
    const purchaseResult = await runQuery(
      `INSERT INTO ticket_purchases 
       (user_id, ticket_type, quantity, total_cost_cents, stripe_session_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, ticketType, quantity, totalPriceInCents, 'placeholder'] // placeholder will be updated
    );

    // ---- CREATE STRIPE SESSION ----
    // This creates a payment page that Stripe will host
    const session = await stripe.checkout.sessions.create({
      // Accept card payments
      payment_method_types: ['card'],
      
      // This is a one-time payment, not a subscription
      mode: 'payment',
      
      // What is being purchased
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${quantity}x ${ticket.displayName}`,
              description: `${quantity} ${ticket.displayName}(s) = ${quantity * ticket.pixelTicketsValue} PixelTickets`,
              // You can add an image URL here if you want
              // images: ['https://example.com/ticket-image.png']
            },
            // Price in cents
            unit_amount: ticket.priceInCents
          },
          quantity: quantity
        }
      ],

      // After successful payment, redirect to frontend
      // {CHECKOUT_SESSION_ID} is replaced by Stripe with the actual session ID
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      
      // If user clicks back, redirect here
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,

      // IMPORTANT: Metadata is sent to webhook after payment
      // The webhook will use this to know what to add to user's account
      metadata: {
        userId: userId.toString(),
        ticketType: ticketType,
        quantity: quantity.toString(),
        pixelTicketsTotal: (quantity * ticket.pixelTicketsValue).toString(),
        userEmail: user.email
      },

      // Optional: Show email field (user might be logged out)
      customer_email: user.email
    });

    // ---- UPDATE PURCHASE RECORD WITH SESSION ID ----
    // Now that we have the real session ID, update the pending record
    await runQuery(
      `UPDATE ticket_purchases 
       SET stripe_session_id = ?
       WHERE id = ?`,
      [session.id, purchaseResult.id]
    );

    // ---- RETURN SUCCESS ----
    return {
      success: true,
      sessionId: session.id,
      price: totalPriceInCents,
      ticketType: ticketType,
      displayName: ticket.displayName,
      quantity: quantity,
      pixelTicketsTotal: quantity * ticket.pixelTicketsValue
    };

  } catch (err) {
    throw new Error('Failed to create checkout session: ' + err.message);
  }
};

// ==================== TICKET INVENTORY MANAGEMENT ====================

/**
 * Function: getUserTicketInventory(userId)
 * Purpose: Get user's current ticket inventory
 * 
 * Returns:
 * {
 *   blackTickets: 5,
 *   purpleTickets: 2,
 *   emeraldTickets: 0,
 *   rubyTickets: 1,
 *   sapphireTickets: 0,
 *   silverTickets: 0,
 *   goldTickets: 0,
 *   diamondTickets: 1,
 *   doublediamondTickets: 0,
 *   total_pixeltickets: 24    // 5*1 + 2*5 + 1*25 + 1*500 = 540... wait let me recalc
 *   // Actually: 5*1 + 2*5 + 1*25 + 1*500 = 5 + 10 + 25 + 500 = 540
 * }
 * 
 * Parameters:
 * - userId: User ID
 * 
 * Returns: Ticket inventory object or null if user has no tickets yet
 */
const getUserTicketInventory = async (userId) => {
  try {
    const inventory = await getQuery(
      `SELECT * FROM user_tickets WHERE user_id = ?`,
      [userId]
    );

    // If no inventory exists, return zeros
    if (!inventory) {
      return {
        user_id: userId,
        blackTickets: 0,
        purpleTickets: 0,
        emeraldTickets: 0,
        rubyTickets: 0,
        sapphireTickets: 0,
        silverTickets: 0,
        goldTickets: 0,
        diamondTickets: 0,
        doublediamondTickets: 0,
        total_pixeltickets: 0
      };
    }

    return inventory;
  } catch (err) {
    throw new Error('Failed to fetch user ticket inventory: ' + err.message);
  }
};

/**
 * Function: addTicketsToUser(userId, ticketType, quantity)
 * Purpose: Add tickets to user's inventory after successful payment
 * 
 * This is called by the webhook after Stripe confirms payment
 * 
 * Process:
 * 1. Get user's current inventory
 * 2. Add the new tickets
 * 3. Recalculate total_pixeltickets
 * 4. Update database
 * 
 * Parameters:
 * - userId: User ID
 * - ticketType: 'diamondTicket', etc.
 * - quantity: How many tickets
 * 
 * Returns: Updated inventory object
 */
const addTicketsToUser = async (userId, ticketType, quantity) => {
  try {
    // Validate ticket type
    validateTicketType(ticketType);

    // Get current inventory or create new one
    let inventory = await getUserTicketInventory(userId);
    
    // If this is their first purchase, create the record
    if (!inventory || !inventory.id) {
      await runQuery(
        `INSERT INTO user_tickets (user_id) VALUES (?)`,
        [userId]
      );
      inventory = await getUserTicketInventory(userId);
    }

    // Add tickets to the appropriate column
    const currentAmount = inventory[ticketType] || 0;
    const newAmount = currentAmount + quantity;

    // Calculate new total PixelTickets
    let totalPixelTickets = 0;
    for (const [key, value] of Object.entries(TICKET_TYPES)) {
      const ticketCount = inventory[key] || 0;
      totalPixelTickets += ticketCount * value.pixelTicketsValue;
    }
    // Add the new tickets we're about to insert
    totalPixelTickets += quantity * TICKET_TYPES[ticketType].pixelTicketsValue;

    // ---- UPDATE INVENTORY ----
    // Update the specific ticket type and total
    const updateSQL = `
      UPDATE user_tickets 
      SET ${ticketType} = ?,
          total_pixeltickets = ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `;

    await runQuery(
      updateSQL,
      [newAmount, totalPixelTickets, userId]
    );

    // ---- RETURN UPDATED INVENTORY ----
    const updatedInventory = await getUserTicketInventory(userId);
    return updatedInventory;

  } catch (err) {
    throw new Error('Failed to add tickets to user: ' + err.message);
  }
};

/**
 * Function: recalculateUserTotalTickets(userId)
 * Purpose: Recalculate total_pixeltickets based on all colored tickets
 * 
 * This is useful if inventory gets out of sync, or for verification
 * 
 * Formula:
 * total = (blackTickets × 1) + (purpleTickets × 5) + ... + (doublediamondTickets × 1000)
 * 
 * Parameters:
 * - userId: User ID
 * 
 * Returns: New total PixelTickets
 */
const recalculateUserTotalTickets = async (userId) => {
  try {
    const inventory = await getUserTicketInventory(userId);

    if (!inventory) {
      return 0;
    }

    // Calculate total by multiplying each ticket type by its PixelTicket value
    let total = 0;
    for (const [ticketKey, ticketInfo] of Object.entries(TICKET_TYPES)) {
      const ticketCount = inventory[ticketKey] || 0;
      total += ticketCount * ticketInfo.pixelTicketsValue;
    }

    // Update database with recalculated total
    await runQuery(
      `UPDATE user_tickets 
       SET total_pixeltickets = ?,
           updated_at = datetime('now')
       WHERE user_id = ?`,
      [total, userId]
    );

    return total;
  } catch (err) {
    throw new Error('Failed to recalculate user total tickets: ' + err.message);
  }
};

// ==================== EXPORTS ====================
// Make functions available to other modules
module.exports = {
  TICKET_TYPES,
  validateTicketType,
  validateQuantity,
  createTicketCheckoutSession,
  getUserTicketInventory,
  addTicketsToUser,
  recalculateUserTotalTickets
};
