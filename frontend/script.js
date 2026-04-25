/**
 * MAIN FRONTEND SCRIPT
 * 
 * This file contains all frontend logic:
 * 1. Canvas rendering for the pixel grid
 * 2. User authentication (login/register)
 * 3. Pixel interaction (click, hover)
 * 4. Ticket purchasing with Stripe
 * 5. Pixel color changes using PixelTickets
 * 6. History page navigation (pages 1-10)
 * 7. Ticket inventory management
 * 
 * ===== CHANGES IN THIS VERSION =====
 * REMOVED: Pixel purchase modal and logic
 * REMOVED: Owner/purchase count/color changes available
 * ADDED: Ticket shop modal with 9 ticket types
 * ADDED: Pixel color change with ticket cost
 * ADDED: History page buttons (1-10)
 * ADDED: Ticket inventory display in navbar
 * ADDED: Insufficient funds warning
 * ADDED: Max changes reached message
 */

// ==================== GLOBAL VARIABLES ====================

// Canvas and drawing context
let canvas = document.getElementById('pixelCanvas');
let ctx = canvas.getContext('2d');

// Stripe integration - Replace with your actual publishable key
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY');

// Current user data
let currentUser = null;

// All pixel data (loaded from server)
let allPixels = [];

// Current history page (1-10, or null for live)
let currentHistoryPage = null;

// Pixel size in canvas (1000x1000 canvas with 1000x1000 pixels = 1px each)
const PIXEL_SIZE = 1;

// API base URL
const API_BASE = 'https://page005.uminion.com';

// Ticket types and their values
// IMPORTANT: Must match backend TICKET_TYPES exactly
const TICKET_TYPES = {
  blackTicket: {
    name: 'blackTicket',
    displayName: 'Black Ticket',
    pixelTicketsValue: 1,
    emoji: '🔵',
    priceInDollars: 2.00
  },
  purpleTicket: {
    name: 'purpleTicket',
    displayName: 'Purple Ticket',
    pixelTicketsValue: 5,
    emoji: '🟣',
    priceInDollars: 10.00
  },
  emeraldTicket: {
    name: 'emeraldTicket',
    displayName: 'Emerald Ticket',
    pixelTicketsValue: 10,
    emoji: '🟢',
    priceInDollars: 20.00
  },
  rubyTicket: {
    name: 'rubyTicket',
    displayName: 'Ruby Ticket',
    pixelTicketsValue: 25,
    emoji: '🔴',
    priceInDollars: 50.00
  },
  sapphireTicket: {
    name: 'sapphireTicket',
    displayName: 'Sapphire Ticket',
    pixelTicketsValue: 50,
    emoji: '🔵',
    priceInDollars: 100.00
  },
  silverTicket: {
    name: 'silverTicket',
    displayName: 'Silver Ticket',
    pixelTicketsValue: 100,
    emoji: '⚪',
    priceInDollars: 200.00
  },
  goldTicket: {
    name: 'goldTicket',
    displayName: 'Gold Ticket',
    pixelTicketsValue: 250,
    emoji: '🟡',
    priceInDollars: 500.00
  },
  diamondTicket: {
    name: 'diamondTicket',
    displayName: 'Diamond Ticket',
    pixelTicketsValue: 500,
    emoji: '💎',
    priceInDollars: 1000.00
  },
  doublediamondTicket: {
    name: 'doublediamondTicket',
    displayName: 'Double Diamond Ticket',
    pixelTicketsValue: 1000,
    emoji: '💠',
    priceInDollars: 2000.00
  }
};

// User's current ticket inventory
let userTicketInventory = null;

// Currently selected pixel (for color change)
let selectedPixel = {
  x: null,
  y: null,
  id: null
};

// ==================== INITIALIZATION ====================

/**
 * Function: Initialize application on page load
 * 
 * Steps:
 * 1. Restore user session if they were logged in before
 * 2. Load all pixels from server (progressively)
 * 3. Set up event listeners
 * 4. If logged in, load ticket inventory and dashboard
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing application...');

  try {
    // Restore user session if exists (stored in localStorage)
    restoreUserSession();

    // Show spinner while loading
    showInlineSpinner(true);

    // Load and render pixels progressively
    // This is fast because we load in batches of 1000 pixels in parallel
    await loadPixelsProgressively();

    // Hide spinner
    showInlineSpinner(false);

    // Set up event listeners for all interactive elements
    setupEventListeners();

    // If user is logged in, load their ticket inventory
    if (currentUser) {
      await loadUserTicketInventory();
      loadHistoryPageButtons();
    }

    console.log('✅ Application initialized successfully');
  } catch (err) {
    console.error('❌ Initialization error:', err);
    showError('Failed to initialize application');
    showInlineSpinner(false);
  }
});

// ==================== USER SESSION MANAGEMENT ====================

/**
 * Function: restoreUserSession()
 * Purpose: Check if user was previously logged in
 * 
 * How it works:
 * 1. Check localStorage for JWT token
 * 2. If token exists, set currentUser
 * 3. Update UI to show logged-in state
 * 
 * JWT tokens last 7 days before expiring
 */
function restoreUserSession() {
  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const userId = localStorage.getItem('userId');

  if (token && userEmail && userId) {
    // User was previously logged in - restore session
    currentUser = {
      id: userId,
      email: userEmail,
      token: token
    };
    console.log(`✅ Restored session for \${userEmail}`);
    updateAuthUI();
  }
}

/**
 * Function: updateAuthUI()
 * Purpose: Update navigation bar based on login status
 * 
 * Shows/hides:
 * - Login/Register buttons (when logged out)
 * - User email, Logout button, Buy Tickets button (when logged in)
 * - Ticket inventory display (when logged in)
 */
function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const buyTicketsBtn = document.getElementById('buyTicketsBtn');
  const userEmail = document.getElementById('userEmail');
  const ticketInventory = document.getElementById('ticketInventory');

  if (currentUser) {
    // User IS logged in
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    buyTicketsBtn.style.display = 'block';
    ticketInventory.style.display = 'flex';
    userEmail.textContent = `👤 \${currentUser.email}`;
    userEmail.style.display = 'inline';
  } else {
    // User is NOT logged in
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    buyTicketsBtn.style.display = 'none';
    ticketInventory.style.display = 'none';
    userEmail.style.display = 'none';
  }
}

// ==================== AUTHENTICATION ====================

/**
 * Function: login(email, password)
 * Purpose: Authenticate user with email and password
 * 
 * Process:
 * 1. Send credentials to /api/auth/login
 * 2. Backend verifies and returns JWT token
 * 3. Store token in localStorage
 * 4. Update UI
 * 5. Load user's ticket inventory
 * 
 * Returns: Promise
 */
async function login(email, password) {
  try {
    showLoading(true);

    const response = await fetch(`\${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    // ---- STORE USER INFO IN MEMORY AND LOCALSTORAGE ----
    currentUser = {
      id: data.data.user.id,
      email: data.data.user.email,
      token: data.data.token
    };

    localStorage.setItem('token', currentUser.token);
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('userEmail', currentUser.email);

    // Update UI
    updateAuthUI();
    await loadUserTicketInventory();
    loadHistoryPageButtons();
    closeModal('loginModal');

    showSuccess('Login successful!');
  } catch (err) {
    console.error('Login error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Function: register(email, password, passwordConfirm)
 * Purpose: Create new user account
 * 
 * Validation:
 * - Passwords must match
 * - Password must be 6+ characters
 * 
 * Process:
 * 1. Send credentials to /api/auth/register
 * 2. Backend creates account and returns token
 * 3. Auto-login user (immediately log them in)
 * 4. Load ticket inventory
 */
async function register(email, password, passwordConfirm) {
  try {
    // ---- VALIDATION ----
    if (password !== passwordConfirm) {
      throw new Error('Passwords do not match');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    showLoading(true);

    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Registration failed');
    }

    // ---- AUTO LOGIN ----
    // User is automatically logged in after registration
    currentUser = {
      id: data.data.user.id,
      email: data.data.user.email,
      token: data.data.token
    };

    localStorage.setItem('token', currentUser.token);
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('userEmail', currentUser.email);

    updateAuthUI();
    await loadUserTicketInventory();
    loadHistoryPageButtons();
    closeModal('registerModal');

    showSuccess('Registration successful! Welcome!');
  } catch (err) {
    console.error('Registration error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Function: logout()
 * Purpose: End user session
 * 
 * Process:
 * 1. Clear currentUser from memory
 * 2. Clear localStorage
 * 3. Update UI
 * 4. Hide ticket inventory
 * 5. Hide history pages
 */
function logout() {
  // Clear user data
  currentUser = null;
  userTicketInventory = null;

  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');

  // Update UI
  updateAuthUI();
  document.getElementById('ticketInventory').style.display = 'none';
  document.getElementById('historyPages').style.display = 'none';

  showSuccess('Logged out successfully');
}

// ==================== PIXEL DATA LOADING ====================

/**
 * Function: loadPixelsProgressively()
 * Purpose: Fetch pixels in batches and render as we go
 * 
 * Optimization: Uses PARALLEL requests
 * Instead of: Wait for batch 1 → batch 2 → batch 3
 * We do:      Send batches 1-20 at once, render as they arrive
 * 
 * Performance:
 * - Batch size: 1000 pixels
 * - Concurrent requests: 20
 * - Total time: ~2-4 seconds for all 1,000,000 pixels
 * 
 * Note: You can change BATCH_SIZE to 500, 750, or 1000
 * (Backend supports up to 1000 per request)
 */
async function loadPixelsProgressively() {
  console.log('📥 Loading pixels progressively...');

  const BATCH_SIZE = 1000;          // Pixels per request
  const TOTAL_PIXELS = 1000000;     // Total pixels in grid
  const CONCURRENT_REQUESTS = 20;   // How many requests at once

  let batchesCompleted = 0;
  const totalBatches = Math.ceil(TOTAL_PIXELS / BATCH_SIZE);

  // Clear canvas with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create queue of all batch numbers
  const batchQueue = [];
  for (let i = 0; i < totalBatches; i++) {
    batchQueue.push(i);
  }

  // Process batches in groups
  while (batchQueue.length > 0) {
    // Take next group of batch numbers
    const batchGroup = batchQueue.splice(0, CONCURRENT_REQUESTS);

    // Send ALL requests in this group in parallel
    const fetchPromises = batchGroup.map(async (batchIndex) => {
      try {
        const start = batchIndex * BATCH_SIZE;
        
        // Fetch this batch from server
        const response = await fetch(
          `${API_BASE}/api/pixels/all?start=${start}&limit=${BATCH_SIZE}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error('Failed to load pixels');
        }

        const batch = data.data;

        // Render batch immediately (don't wait for others)
        for (let pixel of batch) {
          const color = pixel.color || '#ffffff';
          ctx.fillStyle = color;
          ctx.fillRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);

          // Store in allPixels for later reference
          allPixels.push(pixel);
        }

        batchesCompleted++;

        // Log progress
        const percentComplete = Math.round((batchesCompleted / totalBatches) * 100);
        if (batchesCompleted % 5 === 0) {
          console.log(`⏳ Loading... ${percentComplete}%`);
        }

        return batch;
      } catch (err) {
        console.error(`❌ Error loading batch \${batchIndex}:`, err);
        throw err;
      }
    });

    // Wait for ALL requests in this group to finish before sending next group
    await Promise.all(fetchPromises);
  }

  console.log(`✅ Loaded and rendered all pixels`);
}

/**
 * Function: loadHistoryPagePixels(pageNumber)
 * Purpose: Load and render pixels for a specific history page (1-10)
 * 
 * History pages show pixel evolution:
 * - Page 1: All pixels as they looked after change #1
 * - Page 5: All pixels as they looked after change #5
 * - Page 10: Current state (live canvas)
 * 
 * If pixel was changed less than the page number,
 * it shows the latest color it has
 * 
 * Parameters:
 * - pageNumber: 1-10
 * 
 * Returns: Promise
 */
async function loadHistoryPagePixels(pageNumber) {
  try {
    console.log(`📅 Loading history page \${pageNumber}...`);
    showInlineSpinner(true);

    const response = await fetch(
      `${API_BASE}/api/pixels/history${pageNumber}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load history page');
    }

    // Update allPixels with colors from this history page
    const historyPixels = data.data;
    
    // Create a map for quick lookup
    const pixelMap = {};
    for (let pixel of historyPixels) {
      pixelMap[`${pixel.x},${pixel.y}`] = pixel;
    }

    // Update allPixels array
    for (let pixel of allPixels) {
      const key = `${pixel.x},${pixel.y}`;
      if (pixelMap[key]) {
        pixel.color = pixelMap[key].color;
      }
    }

    // Redraw canvas with new colors
    renderCanvas();

    currentHistoryPage = pageNumber;
    console.log(`✅ Loaded history page \${pageNumber}`);

  } catch (err) {
    console.error('Error loading history page:', err);
    showError('Failed to load history page');
  } finally {
    showInlineSpinner(false);
  }
}

/**
 * Function: loadLiveCanvas()
 * Purpose: Load and render the current live canvas (all changes)
 */
async function loadLiveCanvas() {
  try {
    console.log('📡 Loading live canvas...');
    currentHistoryPage = null;
    showInlineSpinner(true);

    // Reload all pixels (shows current state)
    allPixels = [];
    await loadPixelsProgressively();

    currentHistoryPage = null;
    console.log('✅ Live canvas loaded');

  } catch (err) {
    console.error('Error loading live canvas:', err);
    showError('Failed to load live canvas');
  } finally {
    showInlineSpinner(false);
  }
}

// ==================== CANVAS RENDERING ====================

/**
 * Function: renderCanvas()
 * Purpose: Redraw entire canvas (used after changes or history switching)
 * 
 * Algorithm:
 * 1. Clear canvas with white background
 * 2. For each pixel in allPixels array
 * 3. Set fillStyle to pixel color
 * 4. Draw rectangle at (x, y)
 * 5. Uses 1px per pixel
 * 
 * Performance:
 * - Drawing 1,000,000 pixels takes ~16ms
 * - Can run at 60fps on modern hardware
 */
function renderCanvas() {
  console.log('🎨 Rendering canvas...');

  // Clear with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each pixel
  for (let pixel of allPixels) {
    const color = pixel.color || '#ffffff';
    ctx.fillStyle = color;
    ctx.fillRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);
  }

  console.log('✅ Canvas rendered');
}

// ==================== TICKET INVENTORY MANAGEMENT ====================

/**
 * Function: loadUserTicketInventory()
 * Purpose: Fetch user's ticket inventory from server
 * 
 * Returns:
 * {
 *   blackTickets: 5,
 *   purpleTickets: 2,
 *   ...
 *   total_pixeltickets: 540
 * }
 * 
 * Also updates inventory display in navbar
 */
async function loadUserTicketInventory() {
  try {
    if (!currentUser) {
      return;
    }

    const response = await fetch(
      `${API_BASE}/api/user/inventory`,
      {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load inventory');
    }

    userTicketInventory = data.data;
    console.log(`✅ Loaded ticket inventory: ${userTicketInventory.total_pixeltickets} total`);

    // Update navbar display
    updateTicketInventoryDisplay();

    return userTicketInventory;

  } catch (err) {
    console.error('Error loading ticket inventory:', err);
    // Don't show error to user, just log it
  }
}

/**
 * Function: updateTicketInventoryDisplay()
 * Purpose: Update navbar to show user's current tickets
 * 
 * Shows: 🔵 5  🟣 2  💎 1  etc.
 */
function updateTicketInventoryDisplay() {
  if (!userTicketInventory) {
    return;
  }

  const display = document.getElementById('inventoryDisplay');
  display.innerHTML = '';

  // Show each ticket type that user has
  for (const [ticketKey, ticketInfo] of Object.entries(TICKET_TYPES)) {
    const count = userTicketInventory[ticketKey] || 0;
    
    // Only show tickets user has
    if (count > 0) {
      const span = document.createElement('span');
      span.className = 'inventory-item';
      span.textContent = `${ticketInfo.emoji} ${count}`;
      display.appendChild(span);
    }
  }

  // Show total at the end
  const totalSpan = document.createElement('span');
  totalSpan.className = 'inventory-total';
  totalSpan.textContent = `= ${userTicketInventory.total_pixeltickets} total`;
  display.appendChild(totalSpan);
}

// ==================== TICKET CONVERSION FUNCTIONS ====================

/**
 * Function: convertPixelTicketsToColored(totalPixelTickets)
 * Purpose: Convert a total PixelTicket amount to colored tickets
 * 
 * Uses greedy algorithm (largest denominations first)
 * 
 * Example:
 * 498 PixelTickets → "1 Gold + 2 Silver + 1 Ruby + 2 Emerald + 3 Black"
 * 
 * Parameters:
 * - totalPixelTickets: Number like 498, 1024, 2
 * 
 * Returns: String like "1 Gold + 2 Silver + 3 Black"
 */
function convertPixelTicketsToColored(totalPixelTickets) {
  if (totalPixelTickets === 0) return '0 PixelTickets';

  const denominations = [
    { key: 'doublediamondTicket', value: 1000, name: 'Double Diamond' },
    { key: 'diamondTicket', value: 500, name: 'Diamond' },
    { key: 'goldTicket', value: 250, name: 'Gold' },
    { key: 'silverTicket', value: 100, name: 'Silver' },
    { key: 'sapphireTicket', value: 50, name: 'Sapphire' },
    { key: 'rubyTicket', value: 25, name: 'Ruby' },
    { key: 'emeraldTicket', value: 10, name: 'Emerald' },
    { key: 'purpleTicket', value: 5, name: 'Purple' },
    { key: 'blackTicket', value: 1, name: 'Black' }
  ];

  let remaining = totalPixelTickets;
  const parts = [];

  for (const denom of denominations) {
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      parts.push(`${count} ${denom.name}${count > 1 ? 's' : ''}`);
      remaining = remaining % denom.value;
    }
  }

  if (parts.length === 0) return '0 PixelTickets';

  return parts.join(' + ');
}

/**
 * Function: calculatePixelCost(changeNumber)
 * Purpose: Calculate cost in PixelTickets for a pixel change
 * 
 * Formula: 2^(changeNumber - 1)
 * 
 * Examples:
 * Change #1: 2^0 = 1 PixelTicket
 * Change #2: 2^1 = 2 PixelTickets
 * Change #3: 2^2 = 4 PixelTickets
 * ...
 * Change #10: 2^9 = 512 PixelTickets
 * 
 * Parameters:
 * - changeNumber: 1-10
 * 
 * Returns: Cost in PixelTickets (integer)
 */
function calculatePixelCost(changeNumber) {
  if (changeNumber < 1 || changeNumber > 10) {
    throw new Error('Invalid change number');
  }

  return Math.pow(2, changeNumber - 1);
}

// ==================== HISTORY PAGE MANAGEMENT ====================

/**
 * Function: loadHistoryPageButtons()
 * Purpose: Create and show history page buttons (1-10) in navbar
 * 
 * Shows buttons: [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [📡 Live]
 * Active page is highlighted
 */
function loadHistoryPageButtons() {
  const container = document.getElementById('pageButtonsContainer');
  const historyPages = document.getElementById('historyPages');

  if (!container || !historyPages) {
    return;
  }

  // Clear existing buttons
  container.innerHTML = '';

  // Create buttons for pages 1-10
  for (let page = 1; page <= 10; page++) {
    const button = document.createElement('button');
    button.className = 'page-btn';
    if (currentHistoryPage === page) {
      button.classList.add('active');
    }
    button.textContent = page;
    button.onclick = () => switchHistoryPage(page);
    container.appendChild(button);
  }

  // Add "Live" button for current canvas
  const liveButton = document.createElement('button');
  liveButton.className = 'page-btn live-btn';
  if (currentHistoryPage === null) {
    liveButton.classList.add('active');
  }
  liveButton.textContent = '📡 Live';
  liveButton.onclick = () => switchHistoryPage(null);
  container.appendChild(liveButton);

  // Show history pages section
  historyPages.style.display = 'flex';
}

/**
 * Function: switchHistoryPage(pageNumber)
 * Purpose: Switch to a different history page
 * 
 * Parameters:
 * - pageNumber: 1-10, or null for live
 */
async function switchHistoryPage(pageNumber) {
  try {
    if (pageNumber === null) {
      // Show live canvas
      await loadLiveCanvas();
    } else {
      // Show specific history page
      await loadHistoryPagePixels(pageNumber);
    }

    // Update button highlights
    const buttons = document.querySelectorAll('.page-btn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      
      if (btn.classList.contains('live-btn')) {
        if (pageNumber === null) {
          btn.classList.add('active');
        }
      } else {
        if (parseInt(btn.textContent) === pageNumber) {
          btn.classList.add('active');
        }
      }
    });

  } catch (err) {
    console.error('Error switching history page:', err);
    showError('Failed to switch history page');
  }
}

// ==================== PIXEL INTERACTION ====================

/**
 * Function: setupEventListeners()
 * Purpose: Attach all event handlers to interactive elements
 */
function setupEventListeners() {
  // ---- CANVAS EVENTS ----
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mouseleave', () => {
    document.getElementById('hoverInfo').style.display = 'none';
  });

  // ---- NAV BUTTONS ----
  document.getElementById('loginBtn').addEventListener('click', openLoginModal);
  document.getElementById('registerBtn').addEventListener('click', openRegisterModal);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // ---- FORM SUBMISSIONS ----
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
  });

  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    register(email, password, passwordConfirm);
  });

  // ---- PIXEL MODAL CLOSE ----
  const modalCloseBtn = document.querySelector('#pixelModal .close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => closeModal('pixelModal'));
  }

  // ---- MODAL BACKDROP CLOSE ----
  window.addEventListener('click', (e) => {
    const pixelModal = document.getElementById('pixelModal');
    const ticketShopModal = document.getElementById('ticketShopModal');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (e.target === pixelModal) {
      closeModal('pixelModal');
    }
    if (e.target === ticketShopModal) {
      closeTicketShop();
    }
    if (e.target === loginModal) {
      closeModal('loginModal');
    }
    if (e.target === registerModal) {
      closeModal('registerModal');
    }
  });

  // ---- COLOR PICKER MODAL ----
  const colorPickerModal = document.getElementById('colorPickerModal');
  const colorHexInput = document.getElementById('colorHexInput');
  
  if (colorPickerModal) {
    colorPickerModal.addEventListener('input', (e) => {
      // Sync hex input with color picker
      colorHexInput.value = e.target.value;
      // Update preview
      updateColorPreview(e.target.value);
    });
  }

  if (colorHexInput) {
    colorHexInput.addEventListener('input', (e) => {
      // Validate and sync
      if (/^#[0-9A-F]{6}\$/i.test(e.target.value)) {
        colorPickerModal.value = e.target.value;
        updateColorPreview(e.target.value);
      }
    });
  }

    // ---- CHANGE COLOR BUTTON ----
  const changeColorBtn = document.getElementById('changeColorBtn');
  if (changeColorBtn) {
    changeColorBtn.addEventListener('click', handleColorChange);
  }

  // ---- TICKET SHOP BUTTONS ----
  // Event delegation for dynamically created buy buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('buy-ticket-btn')) {
      const ticketQtyInput = e.target.parentElement.querySelector('.ticket-qty');
      if (ticketQtyInput) {
        const ticketType = ticketQtyInput.dataset.ticket;
        const quantity = parseInt(ticketQtyInput.value) || 1;
        buyTickets(ticketType, quantity);
      }
    }
  });
}

/**
 * Function: onCanvasMouseMove(event)
 * Purpose: Show pixel coordinates when hovering over canvas
 * 
 * Shows a tooltip with pixel (x, y) coordinates
 * Only shows if within grid bounds (0-999)
 */
function onCanvasMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  // Validate coordinates are within grid
  if (x >= 0 && x < 1000 && y >= 0 && y < 1000) {
    const hoverInfo = document.getElementById('hoverInfo');
    document.getElementById('hoverCoords').textContent = `Pixel (${x}, ${y})`;
    hoverInfo.style.left = event.clientX + 10 + 'px';
    hoverInfo.style.top = event.clientY + 10 + 'px';
    hoverInfo.style.display = 'block';
  }
}

/**
 * Function: onCanvasClick(event)
 * Purpose: Handle pixel click - show pixel modal
 * 
 * Steps:
 * 1. Get pixel coordinates from click
 * 2. Call showPixelModal with coordinates
 * 3. Modal displays pixel info and action buttons
 */
async function onCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  if (x >= 0 && x < 1000 && y >= 0 && y < 1000) {
    await showPixelModal(x, y);
  }
}

// ==================== PIXEL MODAL ====================

/**
 * Function: showPixelModal(x, y)
 * Purpose: Load pixel data and show details modal
 * 
 * Shows:
 * - Pixel coordinates
 * - How many times changed (0-10)
 * - Cost to change in PixelTickets
 * - Current color
 * - Who last changed it
 * - User's ticket inventory
 * - Color change interface (if not maxed out)
 * - "Buy Tickets" button (if insufficient funds)
 * - "Max changes reached" message (if at limit)
 * - Login prompt (if not logged in)
 */
async function showPixelModal(x, y) {
  try {
    showLoading(true);

    // ---- FETCH PIXEL DATA ----
    const response = await fetch(`${API_BASE}/api/pixels/${x}/${y}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load pixel');
    }

    const pixel = data.data;

    // Store selected pixel for later use
    selectedPixel = {
      x: x,
      y: y,
      id: pixel.id
    };

    // ---- POPULATE MODAL WITH PIXEL INFO ----
    document.getElementById('modalCoords').textContent = `(${x}, ${y})`;
    document.getElementById('modalChangeCount').textContent = pixel.change_count || 0;
    document.getElementById('modalColorHex').textContent = pixel.color || '#FFFFFF';

    // ---- COST TO CHANGE ----
    // Calculate what the NEXT change will cost
    const nextChangeNumber = (pixel.change_count || 0) + 1;
    
    // If already at max (10 changes), can't change anymore
    if (pixel.change_count >= 10) {
      document.getElementById('modalCostTickets').textContent = 'N/A';
      document.getElementById('modalCostDisplay').textContent = '';
    } else {
      const costInTickets = calculatePixelCost(nextChangeNumber);
      const costInColored = convertPixelTicketsToColored(costInTickets);
      document.getElementById('modalCostTickets').textContent = costInTickets;
      document.getElementById('modalCostDisplay').textContent = `(${costInColored})`;
    }

    // ---- COLOR PREVIEW ----
    const colorPreview = document.getElementById('colorPreview');
    if (pixel.color) {
      colorPreview.style.backgroundColor = pixel.color;
      colorPreview.style.display = 'block';
    } else {
      colorPreview.style.display = 'none';
    }

    // ---- LAST CHANGED BY INFO ----
    const lastChangedRow = document.getElementById('lastChangedRow');
    if (pixel.last_changed_by) {
      document.getElementById('modalLastChangedBy').textContent = `User #${pixel.last_changed_by}`;
      lastChangedRow.style.display = 'block';
    } else {
      lastChangedRow.style.display = 'none';
    }

    // ---- HIDE ALL ACTION SECTIONS BY DEFAULT ----
    document.getElementById('colorChangeSection').style.display = 'none';
    document.getElementById('insufficientFundsSection').style.display = 'none';
    document.getElementById('maxChangesMsg').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('userInventoryDisplay').style.display = 'none';

    // ---- DETERMINE WHAT TO SHOW ----

    // Case 1: Pixel has reached max changes (10)
    if (pixel.change_count >= 10) {
      document.getElementById('maxChangesMsg').style.display = 'block';
    }
    // Case 2: User is not logged in
    else if (!currentUser) {
      document.getElementById('loginPrompt').style.display = 'block';
    }
    // Case 3: User is logged in and can change the pixel
    else {
      // Show user's ticket inventory
      document.getElementById('userInventoryDisplay').style.display = 'block';
      populateUserInventoryModal();

      // Calculate cost
      const costInTickets = calculatePixelCost(nextChangeNumber);
      const userTotalTickets = userTicketInventory ? userTicketInventory.total_pixeltickets : 0;

      // Case 3a: User has enough tickets
      if (userTotalTickets >= costInTickets) {
        document.getElementById('colorChangeSection').style.display = 'block';
        
        // Set color picker to current color
        const colorPickerModal = document.getElementById('colorPickerModal');
        const colorHexInput = document.getElementById('colorHexInput');
        
        if (pixel.color) {
          colorPickerModal.value = pixel.color;
          colorHexInput.value = pixel.color;
        } else {
          colorPickerModal.value = '#000000';
          colorHexInput.value = '#000000';
        }

        // Update button text with cost
        const costInColored = convertPixelTicketsToColored(costInTickets);
        document.getElementById('changeCostDisplay').textContent = 
          `${costInTickets} PixelTickets (${costInColored})`;

        // Update preview
        updateColorPreview(colorPickerModal.value);
      }
      // Case 3b: User doesn't have enough tickets
      else {
        document.getElementById('insufficientFundsSection').style.display = 'block';
        
        const shortage = costInTickets - userTotalTickets;
        document.getElementById('ticketShortageText').textContent = 
          `You need ${costInTickets} PixelTickets, but only have ${userTotalTickets}. You need ${shortage} more.`;
      }
    }

    // ---- SHOW MODAL ----
    openModal('pixelModal');

  } catch (err) {
    console.error('Error showing pixel modal:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Function: populateUserInventoryModal()
 * Purpose: Display user's ticket inventory in the pixel modal
 * 
 * Shows: "1 Diamond (500) + 2 Emerald (20) + 3 Black (3) = 523 total"
 */
function populateUserInventoryModal() {
  if (!userTicketInventory) {
    return;
  }

  const display = document.getElementById('modalUserInventory');
  display.innerHTML = '';

  let totalDisplayText = '';
  let hasTickets = false;

  // Show each ticket type
  for (const [ticketKey, ticketInfo] of Object.entries(TICKET_TYPES)) {
    const count = userTicketInventory[ticketKey] || 0;
    
    if (count > 0) {
      hasTickets = true;
      const value = ticketInfo.pixelTicketsValue;
      const totalValue = count * value;
      totalDisplayText += `${count} ${ticketInfo.displayName}${count > 1 ? 's' : ''} (${totalValue}) + `;
    }
  }

  // Remove trailing " + "
  if (totalDisplayText.endsWith(' + ')) {
    totalDisplayText = totalDisplayText.slice(0, -3);
  }

  if (hasTickets) {
    totalDisplayText += ` = ${userTicketInventory.total_pixeltickets} total PixelTickets`;
    display.textContent = totalDisplayText;
  } else {
    display.textContent = 'You have no tickets. Buy some to change pixels!';
  }
}

/**
 * Function: updateColorPreview(hexColor)
 * Purpose: Update the color preview square with selected color
 */
function updateColorPreview(hexColor) {
  const colorPreview = document.getElementById('colorPreview');
  
  // Validate hex color
  if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
    colorPreview.style.backgroundColor = hexColor;
    colorPreview.style.display = 'block';
  }
}

// ==================== COLOR CHANGE HANDLER ====================

/**
 * Function: handleColorChange()
 * Purpose: Change pixel color using PixelTickets
 * 
 * Process:
 * 1. Get selected color from color picker
 * 2. Validate color format
 * 3. Send to backend /api/pixels/:x/:y/change
 * 4. Backend deducts tickets and updates pixel
 * 5. Update canvas with new color
 * 6. Update user's ticket inventory
 * 7. Close modal
 * 8. Show success message
 * 
 * Errors handled:
 * - Invalid color format
 * - Insufficient PixelTickets
 * - Pixel maxed out
 * - Network errors
 */
async function handleColorChange() {
  try {
    if (!currentUser) {
      showError('Please log in to change pixel colors');
      return;
    }

    if (!selectedPixel.x || !selectedPixel.y) {
      showError('No pixel selected');
      return;
    }

    // ---- GET COLOR FROM PICKER ----
    const colorPickerModal = document.getElementById('colorPickerModal');
    let color = colorPickerModal.value;

    // Validate color format
    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      showError('Invalid color format. Use hex color picker.');
      return;
    }

    // Normalize to uppercase
    color = color.toUpperCase();

    showLoading(true);

    // ---- SEND TO BACKEND ----
    console.log(`🎨 Changing pixel (${selectedPixel.x}, ${selectedPixel.y}) to ${color}`);

    const response = await fetch(
      `${API_BASE}/api/pixels${selectedPixel.x}${selectedPixel.y}/change`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ color: color })
      }
    );

    const data = await response.json();

    // ---- HANDLE RESPONSE ----
    if (!response.ok || !data.success) {
      // Check if error is insufficient funds
      if (response.status === 402) {
        // 402 = Payment Required (insufficient funds)
        throw new Error(data.message || 'Insufficient PixelTickets');
      }
      throw new Error(data.message || 'Failed to change pixel color');
    }

    // ---- UPDATE LOCAL PIXEL DATA ----
    const pixel = allPixels.find(p => p.x === selectedPixel.x && p.y === selectedPixel.y);
    if (pixel) {
      pixel.color = color;
      console.log(`✅ Updated local pixel (${selectedPixel.x}, ${selectedPixel.y}) to ${color}`);
    }

    // ---- RE-RENDER CANVAS ----
    renderCanvas();

    // ---- UPDATE USER'S TICKET INVENTORY ----
    await loadUserTicketInventory();

    // ---- CLOSE MODAL ----
    closeModal('pixelModal');

    // ---- SHOW SUCCESS ----
    showSuccess(`Pixel (${selectedPixel.x}, ${selectedPixel.y}) changed to ${color}!`);
    console.log(`✅ Pixel change successful`);

  } catch (err) {
    console.error('❌ Color change error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ==================== TICKET SHOP ====================

/**
 * Function: openTicketShop()
 * Purpose: Open the ticket shop modal
 * 
 * Shows all 9 ticket types with:
 * - Icon
 * - Name
 * - PixelTicket value
 * - Price in dollars
 * - Quantity input
 * - Buy button
 */
function openTicketShop() {
  if (!currentUser) {
    showError('Please log in to buy tickets');
    openLoginModal();
    return;
  }

  openModal('ticketShopModal');
}

/**
 * Function: closeTicketShop()
 * Purpose: Close the ticket shop modal
 */
function closeTicketShop() {
  closeModal('ticketShopModal');
}

/**
 * Function: buyTickets(ticketType, quantity)
 * Purpose: Create Stripe checkout session for ticket purchase
 * 
 * Process:
 * 1. Validate ticket type and quantity
 * 2. Send request to /api/tickets/buy
 * 3. Backend creates Stripe checkout session
 * 4. Redirect to Stripe checkout
 * 5. User pays
 * 6. Stripe webhook adds tickets to account
 * 7. User redirected back to success page
 * 
 * Parameters:
 * - ticketType: e.g., 'diamondTicket'
 * - quantity: Number of tickets (1-100)
 */
async function buyTickets(ticketType, quantity = 1) {
  try {
    if (!currentUser) {
      showError('Please log in to buy tickets');
      openLoginModal();
      return;
    }

    // ---- VALIDATION ----
    if (!TICKET_TYPES[ticketType]) {
      showError('Invalid ticket type');
      return;
    }

    if (!quantity || quantity < 1 || quantity > 100) {
      showError('Quantity must be between 1 and 100');
      return;
    }

    showLoading(true);

    const ticketInfo = TICKET_TYPES[ticketType];
    console.log(`🎟️ Buying ${quantity}x ${ticketInfo.displayName}`);

    // ---- REQUEST CHECKOUT SESSION ----
    const response = await fetch(`${API_BASE}/api/tickets/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({
        ticketType: ticketType,
        quantity: parseInt(quantity)
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create checkout session');
    }

    console.log(`✅ Checkout session created: ${data.data.sessionId}`);

    // ---- REDIRECT TO STRIPE ----
    // Use Stripe.js to redirect to checkout
    const result = await stripe.redirectToCheckout({
      sessionId: data.data.sessionId
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

  } catch (err) {
    console.error('❌ Ticket purchase error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ==================== MODAL HELPERS ====================

/**
 * Function: openModal(id)
 * Purpose: Show a modal by ID
 * 
 * Parameters:
 * - id: Element ID of modal to show
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Function: closeModal(id)
 * Purpose: Hide a modal by ID
 * 
 * Parameters:
 * - id: Element ID of modal to hide
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Function: openLoginModal()
 * Purpose: Show login modal and clear form
 */
function openLoginModal() {
  document.getElementById('loginForm').reset();
  openModal('loginModal');
}

/**
 * Function: openRegisterModal()
 * Purpose: Show register modal and clear form
 */
function openRegisterModal() {
  document.getElementById('registerForm').reset();
  openModal('registerModal');
}

// ==================== UI FEEDBACK ====================

/**
 * Function: showLoading(show)
 * Purpose: Show/hide loading indicator
 * 
 * Shows a spinner overlay while loading
 */
function showLoading(show) {
  // Create loading indicator if it doesn't exist
  let loadingIndicator = document.getElementById('loadingIndicator');
  
  if (!loadingIndicator) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingIndicator);
  }

  loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Function: showInlineSpinner(show)
 * Purpose: Show/hide inline spinner in instructions
 */
function showInlineSpinner(show) {
  const spinner = document.getElementById('loadingSpinnerInline');
  if (spinner) {
    spinner.style.display = show ? 'inline-flex' : 'none';
  }
}

/**
 * Function: showSuccess(message)
 * Purpose: Show success notification to user
 * 
 * In production, use a toast library like:
 * - Toastr
 * - Noty
 * - React-Toastify
 * 
 * For now, uses browser alert
 */
function showSuccess(message) {
  console.log(`✅ ${message}`);
  // TODO: Replace with toast notification
  // In production:
  // toastr.success(message);
  // For now, just log it (user sees result on screen)
}

/**
 * Function: showError(message)
 * Purpose: Show error notification to user
 * 
 * In production, use a toast library
 * For now, uses browser alert
 */
function showError(message) {
  console.error(`❌ ${message}`);
  // TODO: Replace with toast notification
  // In production:
  // toastr.error(message);
  alert('❌ ' + message);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Function: getPixelFromCoords(x, y)
 * Purpose: Find pixel object by coordinates
 * 
 * Parameters:
 * - x: x coordinate
 * - y: y coordinate
 * 
 * Returns: Pixel object or null
 */
function getPixelFromCoords(x, y) {
  return allPixels.find(p => p.x === x && p.y === y) || null;
}

/**
 * Function: updatePixelLocally(x, y, updates)
 * Purpose: Update pixel data in allPixels array
 * 
 * Parameters:
 * - x: x coordinate
 * - y: y coordinate
 * - updates: Object with properties to update
 * 
 * Example:
 * updatePixelLocally(5, 10, { color: '#FF0000', change_count: 2 })
 */
function updatePixelLocally(x, y, updates) {
  const pixel = getPixelFromCoords(x, y);
  if (pixel) {
    Object.assign(pixel, updates);
    console.log(`Updated pixel (${x}, ${y}):`, updates);
  }
}

// ==================== PAGE UNLOAD ====================

/**
 * Handle page unload - clean up if needed
 */
window.addEventListener('beforeunload', () => {
  // Could save any unsaved data here if needed
  console.log('👋 Page unloading...');
});

// ==================== END OF SCRIPT ====================

console.log('✅ Script.js loaded successfully');
