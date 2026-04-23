/**
 * AUTHENTICATION MODULE
 * 
 * This file handles user registration and login.
 * It encrypts passwords and generates JWT tokens for session management.
 * 
 * Key functions:
 * 1. register() - Create new user account
 * 2. login() - Authenticate user and return token
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getQuery } = require('./db');

// ==================== PASSWORD HASHING ====================
/**
 * Function: hashPassword(password)
 * Purpose: Encrypt password using bcrypt
 * 
 * Why bcrypt?
 * - One-way encryption (can't be reversed)
 * - Uses salt (random data) to prevent rainbow tables
 * - Slow on purpose (harder for attackers to brute force)
 * 
 * Parameters: password (plaintext string)
 * Returns: Promise with hashed password
 */
const hashPassword = (password) => {
  // Salt rounds = how many times to run the algorithm (10 = good security)
  return bcrypt.hash(password, 10);
};

/**
 * Function: comparePassword(password, hash)
 * Purpose: Check if plaintext password matches stored hash
 * 
 * This is how we verify login attempts:
 * User enters password -> We hash it -> Compare with stored hash
 * 
 * Returns: Promise with boolean (true = match, false = no match)
 */
const comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ==================== JWT TOKEN GENERATION ====================
/**
 * Function: generateToken(userId, email)
 * Purpose: Create JWT token for authenticated sessions
 * 
 * JWT (JSON Web Token) structure:
 * - Header: Algorithm used (HS256)
 * - Payload: User data (id, email)
 * - Signature: Verification code (signed with secret)
 * 
 * Returns: JWT string
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email: email },           // Payload (user data)
    process.env.JWT_SECRET,                 // Secret key
    { expiresIn: process.env.JWT_EXPIRY }   // Token expires in 7 days
  );
};

// ==================== USER REGISTRATION ====================
/**
 * Function: register(email, password)
 * Purpose: Create new user account
 * 
 * Steps:
 * 1. Validate email format
 * 2. Validate password strength
 * 3. Hash the password
 * 4. Insert into database
 * 5. Generate JWT token
 * 6. Return token and user info
 * 
 * Returns: Promise with { token, user }
 */
const register = async (email, password) => {
  // ---- VALIDATION ----
  // Check if email is provided
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Check email format (simple validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Check password strength (at least 6 characters)
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if email already exists
  const existingUser = await getQuery(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // ---- HASH PASSWORD ----
  // Convert plaintext password to encrypted hash
  const passwordHash = await hashPassword(password);

  // ---- INSERT USER INTO DATABASE ----
  // Store new user
  const result = await runQuery(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [email, passwordHash]
  );

  // ---- GENERATE TOKEN ----
  // Create JWT for immediate login
  const token = generateToken(result.id, email);

  return {
    token,
    user: {
      id: result.id,
      email: email
    }
  };
};

// ==================== USER LOGIN ====================
/**
 * Function: login(email, password)
 * Purpose: Authenticate user and return JWT token
 * 
 * Steps:
 * 1. Find user by email in database
 * 2. Compare provided password with stored hash
 * 3. If match, generate new token
 * 4. Return token
 * 
 * Returns: Promise with { token, user }
 */
const login = async (email, password) => {
  // ---- VALIDATION ----
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // ---- FIND USER ----
  // Look up user by email
  const user = await getQuery(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [email]
  );

  // User doesn't exist
  if (!user) {
    throw new Error('User not found');
  }

  // ---- VERIFY PASSWORD ----
  // Compare entered password with stored hash
  const passwordMatch = await comparePassword(password, user.password_hash);

  if (!passwordMatch) {
    throw new Error('Invalid password');
  }

  // ---- GENERATE TOKEN ----
  // Create new JWT token
  const token = generateToken(user.id, user.email);

  return {
    token,
    user: {
      id: user.id,
      email: user.email
    }
  };
};

// ==================== EXPORTS ====================
module.exports = {
  register,
  login,
  generateToken,
  hashPassword,
  comparePassword
};
