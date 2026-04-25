/**
 * MAIN SERVER FILE
 * 
 * This file initializes and runs the Express server.
 * It sets up all routes, middleware, and database connections.
 * 
 * Think of this as the "brain" of the backend that:
 * 1. Starts the HTTP server
 * 2. Connects to the database
 * 3. Initializes all API routes
 * 4. Handles Stripe webhooks
 * 
 * ===== CHANGES IN THIS VERSION =====
 * REMOVED: /api/pixels/:id/color (old version for owned pixels)
 * REMOVED: /api/user/pixels (old version for user's owned pixels)
 * REMOVED: /api/pixels/:id/create-checkout (pixel purchase, no longer exists)
 * ADDED: /api/pixels/:x/:y/change (new: change pixel color using tickets)
 * ADDED: /api/tickets/buy (new: create checkout session for tickets)
 * ADDED: /api/user/inventory (new: get user's ticket inventory)
 * ADDED: /api/pixels/history/:page (new: get pixels at specific history page)
 */

// ==================== IMPORTS ====================
// These bring in external libraries and local files
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import our custom modules
const db = require('./db');
const auth = require('./auth');
const pixels = require('./pixels');
const tickets = require('./tickets');
const stripeWebhook = require('./stripe-webhook');
const { authenticateToken } = require('./middleware');

const woocommerceWebhook = require('./woocommerce-webhook');


// ==================== INITIALIZATION ====================
// Create Express app instance
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE SETUP ====================
// These are functions that run on every request

// CORS: Allow frontend to communicate with backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // Allow cookies
}));

// Parse incoming JSON request bodies
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static files (frontend)
app.use(express.static('../frontend'));

// ==================== DATABASE INITIALIZATION ====================
// Initialize SQLite database (creates tables if they don't exist)
db.initializeDatabase().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});


// WooCommerce Related:

app.post('/api/woocommerce/webhook', woocommerceWebhook);




app.post('/api/woocommerce/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
    woocommerceWebhook(req, res);
  }
);






// ==================== API ROUTES ====================

// ---- AUTHENTICATION ROUTES ----
// These handle user registration and login
// NO CHANGES from previous version

// Route: POST /api/auth/register
// Purpose: Create a new user account
// Body: { email, password }
app.post('/api/auth/register', (req, res) => {
  auth.register(req.body.email, req.body.password)
    .then(result => {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    })
    .catch(err => {
      res.status(400).json({
        success: false,
        message: err.message
      });
    });
});

// Route: POST /api/auth/login
// Purpose: Authenticate user and return JWT token
// Body: { email, password }
app.post('/api/auth/login', (req, res) => {
  auth.login(req.body.email, req.body.password)
    .then(result => {
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    })
    .catch(err => {
      res.status(401).json({
        success: false,
        message: err.message
      });
    });
});

// ---- PIXEL ROUTES ----
// These handle pixel data and color changes
//
// ===== CHANGES FROM OLD VERSION =====
// REMOVED: POST /api/pixels/:id/color (old color change for owners)
// REMOVED: GET /api/user/pixels (old get user's owned pixels)
// REMOVED: POST /api/pixels/:id/create-checkout (pixel purchase)
// ADDED: POST /api/pixels/:x/:y/change (new color change using tickets)
// ADDED: GET /api/pixels/history/:page (new history pages 1-10)

// Route: GET /api/pixels/all
// Purpose: Load pixel data for the grid (with optional pagination)
// Query params: ?start=0&limit=250
// Returns: Array of pixels with current colors
// NO CHANGES
app.get('/api/pixels/all', (req, res) => {
  const { start = 0, limit = 250 } = req.query;
  
  pixels.getAllPixels(parseInt(start), parseInt(limit))
    .then(data => {
      res.status(200).json({
        success: true,
        data: data,
        start: parseInt(start),
        limit: parseInt(limit),
        total: 1000000 // Total pixels in system
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });
});

// Route: GET /api/pixels/:x/:y
// Purpose: Get data for a specific pixel
// Params: x, y = pixel coordinates (0-999)
// Returns: Pixel object with color, change_count, next_cost_tickets, etc.
// NO CHANGES from structure, only return fields changed
app.get('/api/pixels/:x/:y', (req, res) => {
  const { x, y } = req.params;
  pixels.getPixel(parseInt(x), parseInt(y))
    .then(data => {
      res.status(200).json({
        success: true,
        data: data
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });
});

// ===== NEW ROUTE: Change Pixel Color =====
// Route: POST /api/pixels/:x/:y/change
// Purpose: Change a pixel's color using PixelTickets
// Auth: Required (only logged-in users)
// Params: x, y = pixel coordinates
// Body: { color: "#FF0000" }
// 
// Returns:
// {
//   success: true,
//   pixel: { ... updated pixel data ... },
//   newUserTotalTickets: 485,
//   costUsed: 15
// }
// 
// Errors:
// - "Invalid hex color format. Use #RRGGBB"
// - "This pixel has reached maximum changes (10). Cannot change anymore."
// - "Insufficient PixelTickets. Need 64, have 32, shortage: 32"
// - "Pixel not found"
app.post('/api/pixels/:x/:y/change', authenticateToken, (req, res) => {
  const { x, y } = req.params;
  const { color } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (!color) {
    return res.status(400).json({
      success: false,
      message: 'Color is required'
    });
  }

  pixels.changePixelColor(parseInt(x), parseInt(y), userId, color)
    .then(result => {
      res.status(200).json({
        success: true,
        message: 'Pixel color changed successfully',
        data: result
      });
    })
    .catch(err => {
      // Check if error is due to insufficient funds
      if (err.message.includes('Insufficient PixelTickets')) {
        return res.status(402).json({  // 402 = Payment Required
          success: false,
          message: err.message
        });
      }
      
      res.status(400).json({
        success: false,
        message: err.message
      });
    });
});

// ===== NEW ROUTE: Get Pixel History =====
// Route: GET /api/pixels/:x/:y/history
// Purpose: Get all color changes for a specific pixel
// Params: x, y = pixel coordinates
// 
// Returns: Array of history records
// [
//   {
//     change_number: 1,
//     color: '#FF0000',
//     changed_by_user_id: 123,
//     changed_at: '2024-01-01 10:00:00'
//   },
//   { ... }
// ]
app.get('/api/pixels/:x/:y/history', (req, res) => {
  const { x, y } = req.params;

  pixels.getPixelHistory(parseInt(x), parseInt(y))
    .then(data => {
      res.status(200).json({
        success: true,
        data: data
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });
});

// ===== NEW ROUTE: Get History Page Pixels =====
// Route: GET /api/pixels/history/:page
// Purpose: Get all pixels showing their state at a specific history page (1-10)
// Params: page = 1, 2, 3, ... 10
// 
// This is used for the "History Pages" feature
// Page 1 = show pixels with their change #1 color
// Page 5 = show pixels with their change #5 color (or latest if < 5)
// Page 10 = show current state (live canvas)
// 
// Returns: Array of all 1,000,000 pixels with their color at that page
// [
//   { id: 1, x: 0, y: 0, color: '#FFFFFF', change_count: 0, last_changed_by: null },
//   { id: 2, x: 1, y: 0, color: '#FF0000', change_count: 3, last_changed_by: 123 },
//   { ... }
// ]
app.get('/api/pixels/history/:page', (req, res) => {
  const { page } = req.params;
  const pageNum = parseInt(page);

  // Validate page number
  if (isNaN(pageNum) || pageNum < 1 || pageNum > 10) {
    return res.status(400).json({
      success: false,
      message: 'Page must be between 1 and 10'
    });
  }

  pixels.getHistoryPagePixels(pageNum)
    .then(data => {
      res.status(200).json({
        success: true,
        page: pageNum,
        totalPixels: data.length,
        data: data
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });
});

// ---- TICKET ROUTES ----
// These handle ticket purchases and inventory
//
// ===== NEW ROUTES SECTION =====
// All of these routes are new (replace old pixel purchase routes)

// ===== NEW ROUTE: Buy Tickets =====
// Route: POST /api/tickets/buy
// Purpose: Create Stripe checkout session for buying tickets
// Auth: Required (only logged-in users)
// 
// Body: {
//   ticketType: 'diamondTicket',
//   quantity: 1
// }
// 
// Returns: {
//   success: true,
//   sessionId: 'cs_live_a1b2c3d4...',
//   price: 100000,          // in cents
//   ticketType: 'diamondTicket',
//   displayName: 'Diamond Ticket',
//   quantity: 1,
//   pixelTicketsTotal: 500
// }
// 
// Frontend uses sessionId to redirect to Stripe checkout
app.post('/api/tickets/buy', authenticateToken, (req, res) => {
  const { ticketType, quantity } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (!ticketType || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'ticketType and quantity are required'
    });
  }

  tickets.createTicketCheckoutSession(userId, ticketType, parseInt(quantity))
    .then(result => {
      res.status(200).json({
        success: true,
        data: result
      });
    })
    .catch(err => {
      res.status(400).json({
        success: false,
        message: err.message
      });
    });
});

// ===== NEW ROUTE: Get User Ticket Inventory =====
// Route: GET /api/user/inventory
// Purpose: Get logged-in user's ticket inventory
// Auth: Required
// 
// Returns: {
//   success: true,
//   data: {
//     blackTickets: 5,
//     purpleTickets: 2,
//     emeraldTickets: 0,
//     rubyTickets: 1,
//     sapphireTickets: 0,
//     silverTickets: 0,
//     goldTickets: 0,
//     diamondTickets: 0,
//     doublediamondTickets: 0,
//     total_pixeltickets: 540  // 5*1 + 2*5 + 1*25
//   }
// }
app.get('/api/user/inventory', authenticateToken, (req, res) => {
  const userId = req.user.id;

  tickets.getUserTicketInventory(userId)
    .then(inventory => {
      res.status(200).json({
        success: true,
        data: inventory
      });
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: err.message
      });
    });
});







// I think the stuff below is now officially outdated as of 4:15pm on 4/25/26 as long as code works moving forward; feel free deleting it/preparingItForDeletion -Salem 4:15pm on -4/25/26

// ---- STRIPE WEBHOOK ROUTE ----
// This endpoint receives notifications from Stripe after payments
// IMPORTANT: This uses raw body, not JSON parsed body
// Otherwise Stripe signature verification will fail
//
// ===== CHANGES FROM OLD VERSION =====
// OLD: Webhook added pixel ownership and doubled price
// NEW: Webhook adds tickets to user's inventory
app.post('/api/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  (req, res) => {
    stripeWebhook.handlePaymentSuccess(req.body, req.headers['stripe-signature'])
      .then(() => {
        res.status(200).json({ received: true });
      })
      .catch(err => {
        console.error('Webhook error:', err);
        res.status(400).json({ error: err.message });
      });
  }
);

// ==================== ERROR HANDLING ====================
// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ==================== START SERVER ====================
// Begin listening for incoming requests
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🎨 MILLION PIXEL GRID SERVER RUNNING  ║
╚════════════════════════════════════════╝
  
  ✨ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  🔧 Backend:  http://localhost:${PORT}
  💾 Database: ${process.env.DB_PATH || './database/million-pixel.db'}
  
  ===== API ENDPOINTS =====
  
  AUTHENTICATION:
  POST   /api/auth/register         - Create user account
  POST   /api/auth/login            - Login user
  
  PIXELS (READ):
  GET    /api/pixels/all            - Get all pixels with pagination
  GET    /api/pixels/:x/:y          - Get single pixel data
  GET    /api/pixels/:x/:y/history  - Get pixel change history
  GET    /api/pixels/history/:page  - Get all pixels at history page (1-10)
  
  PIXELS (WRITE):
  POST   /api/pixels/:x/:y/change   - Change pixel color (requires auth + tickets)
  
  TICKETS:
  POST   /api/tickets/buy           - Create checkout session for tickets (requires auth)
  GET    /api/user/inventory        - Get user's ticket inventory (requires auth)
  
  WEBHOOK:
  POST   /api/webhook/stripe        - Stripe payment confirmation webhook
  
  Press Ctrl+C to stop the server
  `);
});

// Export for testing purposes
module.exports = app;
