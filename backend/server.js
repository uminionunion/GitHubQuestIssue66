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
const stripeWebhook = require('./stripe-webhook');
const { authenticateToken } = require('./middleware');

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

// ==================== API ROUTES ====================

// ---- AUTHENTICATION ROUTES ----
// These handle user registration and login

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
// These handle pixel data, purchases, and colors

// Route: GET /api/pixels/all
// Purpose: Load pixel data for the grid (with optional pagination)
// Query params: ?start=0&limit=250
// Returns: Array of pixels
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
// Params: x, y = pixel coordinates
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

// Route: POST /api/pixels/:id/color
// Purpose: Update a pixel's color (only if user owns it and has changes left)
// Auth: Required (only logged-in users)
// Body: { color: "#FFFFFF" }
app.post('/api/pixels/:id/color', authenticateToken, (req, res) => {
  const pixelId = parseInt(req.params.id);
  const { color } = req.body;
  const userId = req.user.id;

  pixels.updatePixelColor(pixelId, userId, color)
    .then(result => {
      res.status(200).json({
        success: true,
        message: 'Pixel color updated',
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

// Route: GET /api/user/pixels
// Purpose: Get all pixels owned by the logged-in user
// Auth: Required
app.get('/api/user/pixels', authenticateToken, (req, res) => {
  pixels.getUserPixels(req.user.id)
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

// Route: POST /api/pixels/:id/create-checkout
// Purpose: Create a Stripe checkout session for pixel purchase
// Auth: Required
// Body: { price, purchase_count, x, y }
app.post('/api/pixels/:id/create-checkout', authenticateToken, (req, res) => {
  const pixelId = parseInt(req.params.id);
  const userId = req.user.id;
  const { price, purchase_count, x, y } = req.body;

  pixels.createCheckoutSession(pixelId, userId, price, purchase_count, x, y)
    .then(result => {
      res.status(200).json({
        success: true,
        sessionId: result.id
      });
    })
    .catch(err => {
      res.status(400).json({
        success: false,
        message: err.message
      });
    });
});

// ---- STRIPE WEBHOOK ROUTE ----
// This endpoint receives notifications from Stripe after payments
// IMPORTANT: This uses raw body, not JSON parsed body
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
  
  Press Ctrl+C to stop the server
  `);
});

// Export for testing purposes
module.exports = app;
