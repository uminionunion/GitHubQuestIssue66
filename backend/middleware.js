/**
 * MIDDLEWARE MODULE
 * 
 * Middleware = functions that run BEFORE route handlers
 * They can inspect requests, modify them, or block them
 * 
 * Key middleware:
 * 1. authenticateToken - Verify JWT token
 */

const jwt = require('jsonwebtoken');

// ==================== JWT TOKEN VERIFICATION ====================
/**
 * Middleware: authenticateToken
 * Purpose: Verify JWT token and extract user information
 * 
 * How it works:
 * 1. Client sends token in Authorization header
 * 2. We extract and verify the token
 * 3. If valid, add user info to request object
 * 4. If invalid, reject with 401 Unauthorized
 * 
 * Usage in routes:
 * app.get('/protected', authenticateToken, (req, res) => {
 *   // req.user now contains { id, email }
 * })
 * 
 * Expected header format:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
const authenticateToken = (req, res, next) => {
  // Get Authorization header
  const authHeader = req.headers['authorization'];
  
  // Extract token (format: "Bearer TOKEN")
  // If header is "Bearer abc123def456", token will be "abc123def456"
  const token = authHeader && authHeader.split(' ')[1];

  // No token provided
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // ---- VERIFY TOKEN ----
  // Use the same secret key that signed it
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Token is invalid or expired
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // ---- TOKEN VALID ----
    // Attach user info to request so routes can access it
    // (req.user will be { id, email, iat, exp })
    req.user = user;

    // Continue to next middleware/route handler
    next();
  });
};

// ==================== EXPORTS ====================
module.exports = {
  authenticateToken
};
