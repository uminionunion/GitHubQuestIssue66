/**
 * MAIN FRONTEND SCRIPT
 * 
 * This file contains all frontend logic:
 * 1. Canvas rendering for the pixel grid
 * 2. User authentication (login/register)
 * 3. Pixel interaction (click, hover)
 * 4. Stripe integration for payments
 * 5. Dashboard functionality
 * 
 * Key concepts:
 * - Canvas is used for rendering (not DOM elements) for performance
 * - LocalStorage stores JWT token for session persistence
 * - EventListeners handle user interactions
 */

// ==================== GLOBAL VARIABLES ====================

// Canvas and drawing context
let canvas = document.getElementById('pixelCanvas');
let ctx = canvas.getContext('2d');

// Stripe integration
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // Replace with your key

// Current user data
let currentUser = null;

// All pixel data (loaded from server)
let allPixels = [];

// Pixel size in canvas (1000x1000 canvas with 1000x1000 pixels = 1px each)
const PIXEL_SIZE = 1;

// API base URL
const API_BASE = 'https://page005.uminion.com';

// ==================== INITIALIZATION ====================

/**
 * Function: init()
 * Purpose: Run when page loads
 * 
 * Does:
 * 1. Check if user is logged in (restore from localStorage)
 * 2. Load all pixel data from server
 * 3. Render canvas
 * 4. Set up event listeners
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing application...');

  try {
    // Restore user session if exists
    restoreUserSession();

    // Load pixel data
    await loadPixels();

    // Render canvas
    renderCanvas();

    // Set up event listeners
    setupEventListeners();

    console.log('✅ Application initialized successfully');
  } catch (err) {
    console.error('❌ Initialization error:', err);
    showError('Failed to initialize application');
  }
});

// ==================== USER AUTHENTICATION ====================

/**
 * Function: restoreUserSession()
 * Purpose: Check if user was previously logged in
 * 
 * How it works:
 * - Browser stores JWT token in localStorage
 * - On page load, we retrieve it and restore user session
 * - Token expires after 7 days
 */
function restoreUserSession() {
  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const userId = localStorage.getItem('userId');

  if (token && userEmail && userId) {
    // User was previously logged in
    currentUser = {
      id: userId,
      email: userEmail,
      token: token
    };
    updateAuthUI();
    loadUserDashboard();
  }
}

/**
 * Function: updateAuthUI()
 * Purpose: Update navigation bar based on login status
 * 
 * Shows/hides:
 * - Login/Register buttons (when logged out)
 * - User email and Logout button (when logged in)
 */
function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmail = document.getElementById('userEmail');

  if (currentUser) {
    // User is logged in
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    userEmail.textContent = `👤 ${currentUser.email}`;
    userEmail.style.display = 'inline';
  } else {
    // User is logged out
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    userEmail.style.display = 'none';
  }
}

/**
 * Function: login(email, password)
 * Purpose: Authenticate user with email and password
 * 
 * Steps:
 * 1. Send credentials to backend
 * 2. Backend verifies password and returns JWT token
 * 3. Store token in localStorage
 * 4. Update UI
 * 
 * Returns: Promise
 */
async function login(email, password) {
  try {
    showLoading(true);

    const response = await fetch(`${API_BASE}/api/auth/login`, {
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

    // ---- STORE USER INFO ----
    currentUser = {
      id: data.data.user.id,
      email: data.data.user.email,
      token: data.data.token
    };

    // Store in localStorage for persistence
    localStorage.setItem('token', currentUser.token);
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('userEmail', currentUser.email);

    // Update UI
    updateAuthUI();
    loadUserDashboard();
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
 * Function: register(email, password)
 * Purpose: Create new user account
 * 
 * Steps:
 * 1. Validate passwords match
 * 2. Send to backend
 * 3. Backend creates account and returns token
 * 4. Auto-login user
 */
async function register(email, password, passwordConfirm) {
  try {
    // Validate inputs
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
    currentUser = {
      id: data.data.user.id,
      email: data.data.user.email,
      token: data.data.token
    };

    localStorage.setItem('token', currentUser.token);
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('userEmail', currentUser.email);

    updateAuthUI();
    loadUserDashboard();
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
 */
function logout() {
  // Clear user data
  currentUser = null;

  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');

  // Update UI
  updateAuthUI();
  document.getElementById('dashboard').style.display = 'none';

  showSuccess('Logged out successfully');
}

// ==================== PIXEL DATA LOADING ====================

/**
 * Function: loadPixels()
 * Purpose: Fetch all pixel data from server
 * 
 * Performance note:
 * - This loads 1,000,000 pixels from database
 * - Server sends as optimized JSON
 * - In production, might implement pagination or compression
 * 
 * Returns: Promise
 */
async function loadPixels() {
  try {
    showLoading(true);
    console.log('📥 Loading pixel data...');

    const response = await fetch(`${API_BASE}/api/pixels/all`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load pixels');
    }

    allPixels = data.data;
    console.log(`✅ Loaded ${allPixels.length} pixels`);

  } catch (err) {
    console.error('Error loading pixels:', err);
    showError('Failed to load pixel data');
  } finally {
    showLoading(false);
  }
}

// ==================== CANVAS RENDERING ====================

/**
 * Function: renderCanvas()
 * Purpose: Draw all pixels on canvas
 * 
 * Algorithm:
 * 1. Clear canvas
 * 2. For each pixel, get its color
 * 3. Draw rectangle at correct coordinates
 * 4. Default to light gray if no color
 * 
 * Performance:
 * - Uses canvas instead of DOM elements (much faster)
 * - Draws all 1,000,000 pixels in one pass
 * - Can redraw in ~16ms (60fps)
 */
function renderCanvas() {
  console.log('🎨 Rendering canvas...');

  // Clear canvas with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each pixel
  for (let pixel of allPixels) {
    // Use color if set, otherwise light gray
    const color = pixel.color || '#e0e0e0';

    ctx.fillStyle = color;
    ctx.fillRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);

    // Optional: Draw grid lines (commented out for performance)
    // ctx.strokeStyle = '#ddd';
    // ctx.strokeRect(pixel.x, pixel.y, PIXEL_SIZE, PIXEL_SIZE);
  }

  console.log('✅ Canvas rendered');
}

// ==================== PIXEL INTERACTION ====================

/**
 * Function: setupEventListeners()
 * Purpose: Attach event handlers to interactive elements
 */
function setupEventListeners() {
  // ---- CANVAS EVENTS ----
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mouseleave', () => {
    document.getElementById('hoverInfo').style.display = 'none';
  });

  // ---- BUTTON EVENTS ----
  document.getElementById('loginBtn').addEventListener('click', () => {
    openLoginModal();
  });

  document.getElementById('registerBtn').addEventListener('click', () => {
    openRegisterModal();
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // ---- FORM EVENTS ----
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

  // ---- MODAL EVENTS ----
  document.querySelector('.close').addEventListener('click', () => {
    closeModal('pixelModal');
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const pixelModal = document.getElementById('pixelModal');
    if (e.target === pixelModal) {
      closeModal('pixelModal');
    }
  });

  // ---- PIXEL ACTION BUTTONS ----
  document.getElementById('purchaseBtn').addEventListener('click', handlePixelPurchase);
  document.getElementById('applyColorBtn').addEventListener('click', handleColorChange);
}

/**
 * Function: onCanvasMouseMove(event)
 * Purpose: Handle mouse movement over canvas
 * 
 * Shows:
 * - Coordinates of pixel under cursor
 */
function onCanvasMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  // Validate coordinates
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
 * Purpose: Handle pixel click
 * 
 * Shows pixel info modal with:
 * - Coordinates
 * - Current price
 * - Purchase count
 * - Owner
 * - Color
 * - Action buttons
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

/**
 * Function: showPixelModal(x, y)
 * Purpose: Load pixel data and show details modal
 */
async function showPixelModal(x, y) {
  try {
    showLoading(true);

    // Fetch pixel data
    const response = await fetch(`${API_BASE}/api/pixels/${x}/${y}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load pixel');
    }

    const pixel = data.data;

    // ---- POPULATE MODAL ----
document.getElementById('modalCoords').textContent = `(${x}, ${y})`;
document.getElementById('modalPrice').textContent = (pixel.current_price).toFixed(2);  // REMOVED /100
document.getElementById('modalPurchaseCount').textContent = pixel.purchase_count;
document.getElementById('modalOwner').textContent = pixel.owner_user_id ? 'Someone' : 'Unclaimed';
document.getElementById('modalColor').textContent = pixel.color || 'Not set';

// HIDE purchase count if 0, show if >= 1
const purchaseCountRow = document.getElementById('purchaseCountRow');
if (pixel.purchase_count >= 1) {
  purchaseCountRow.style.display = 'block';
} else {
  purchaseCountRow.style.display = 'none';
}

    // ---- SHOW/HIDE ACTION BUTTONS ----

    // Hide all action sections by default
    document.getElementById('colorChangeSection').style.display = 'none';
    document.getElementById('purchaseBtn').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('maxPurchasesMsg').style.display = 'none';

    // Check if pixel is at max purchases
    if (pixel.purchase_count >= 10) {
      document.getElementById('maxPurchasesMsg').style.display = 'block';
    }
    // Check if user owns pixel
    else if (currentUser && pixel.owner_user_id === currentUser.id) {
      // User owns it, show color change option
      const changesAvailable = pixel.color_changes_available || 0;
      document.getElementById('colorChangesAvailable').textContent = 
        `You have ${changesAvailable} color change(s) available`;

      if (changesAvailable > 0) {
        document.getElementById('colorChangeSection').style.display = 'block';
        // Set color picker to current color
        if (pixel.color) {
          document.getElementById('colorPicker').value = pixel.color;
        }
      }
    }
    // Check if user can purchase
    else if (pixel.purchase_count < 10) {
      if (!currentUser) {
        // Not logged in
        document.getElementById('loginPrompt').style.display = 'block';
      } else {
        // Logged in and can purchase
        document.getElementById('purchaseBtn').style.display = 'block';
        document.getElementById('purchasePrice').textContent = 
          (pixel.current_price / 100).toFixed(2);

        // Store pixel info for purchase handler
        document.getElementById('purchaseBtn').dataset.pixelId = pixel.id;
        document.getElementById('purchaseBtn').dataset.price = pixel.current_price;
        document.getElementById('purchaseBtn').dataset.purchaseCount = pixel.purchase_count;
        document.getElementById('purchaseBtn').dataset.x = x;
        document.getElementById('purchaseBtn').dataset.y = y;
      }
    }

    // Show modal
    openModal('pixelModal');

  } catch (err) {
    console.error('Error showing pixel modal:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Function: handlePixelPurchase()
 * Purpose: Initiate Stripe checkout for pixel purchase
 * 
 * Flow:
 * 1. Get pixel info from button dataset
 * 2. Send request to backend
 * 3. Backend creates Stripe checkout session
 * 4. Redirect to Stripe
 * 5. After payment, Stripe webhook updates database
 */
async function handlePixelPurchase() {
  try {
    if (!currentUser) {
      showError('Please log in to purchase');
      return;
    }

    showLoading(true);

    const pixelId = this.dataset.pixelId;
    const price = parseInt(this.dataset.price);
    const purchaseCount = parseInt(this.dataset.purchaseCount);
    const x = parseInt(this.dataset.x);
    const y = parseInt(this.dataset.y);

    // Request checkout session from backend
    const response = await fetch(`${API_BASE}/api/pixels/${pixelId}/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({
        price,
        purchase_count: purchaseCount,
        x,
        y
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to create checkout session');
    }

    // ---- REDIRECT TO STRIPE ----
    // Use Stripe.js to redirect to checkout
    const result = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

  } catch (err) {
    console.error('Purchase error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Function: handleColorChange()
 * Purpose: Update pixel color for owned pixel
 */
async function handleColorChange() {
  try {
    if (!currentUser) {
      showError('Please log in');
      return;
    }

    showLoading(true);

    const pixelId = document.getElementById('purchaseBtn').dataset.pixelId || 
                    getPixelIdFromModal();
    const color = document.getElementById('colorPicker').value;

    const response = await fetch(`${API_BASE}/api/pixels/${pixelId}/color`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({ color })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to update color');
    }

    // Update pixel in local array
    const pixel = allPixels.find(p => p.id === parseInt(pixelId));
    if (pixel) {
      pixel.color = color;
    }

    // Re-render canvas
    renderCanvas();

    // Close modal
    closeModal('pixelModal');

    showSuccess('Pixel color updated!');

  } catch (err) {
    console.error('Color change error:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ==================== USER DASHBOARD ====================

/**
 * Function: loadUserDashboard()
 * Purpose: Load and display all pixels owned by user
 */
async function loadUserDashboard() {
  try {
    if (!currentUser) {
      document.getElementById('dashboard').style.display = 'none';
      return;
    }

    showLoading(true);

    const response = await fetch(`${API_BASE}/api/user/pixels`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load user pixels');
    }

    // Display dashboard if user owns pixels
    const dashboard = document.getElementById('dashboard');
    const container = document.getElementById('ownedPixelsContainer');

    if (data.data.length === 0) {
      dashboard.style.display = 'none';
      return;
    }

    dashboard.style.display = 'block';
    container.innerHTML = '';

    // Create card for each pixel
    for (let pixel of data.data) {
      const card = document.createElement('div');
      card.className = 'pixel-card';
      card.innerHTML = `
        <div class="pixel-card-color" style="background-color: ${pixel.color || '#ddd'};"></div>
        <div class="pixel-card-coords">Pixel (${pixel.x}, ${pixel.y})</div>
        <div class="pixel-card-info">Price: $${(pixel.current_price / 100).toFixed(2)}</div>
        <div class="pixel-card-info">Purchases: ${pixel.purchase_count}</div>
        <div class="pixel-card-info">Color changes: ${pixel.color_changes_available}</div>
      `;

      card.addEventListener('click', () => {
        showPixelModal(pixel.x, pixel.y);
      });

      container.appendChild(card);
    }

  } catch (err) {
    console.error('Error loading dashboard:', err);
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ==================== MODAL HELPERS ====================

/**
 * Function: openModal(id)
 * Purpose: Show a modal by ID
 */
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

/**
 * Function: closeModal(id)
 * Purpose: Hide a modal by ID
 */
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
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
 */
function showLoading(show) {
  document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

/**
 * Function: showSuccess(message)
 * Purpose: Show success notification
 */
function showSuccess(message) {
  // In production, use a toast library
  alert('✅ ' + message);
}

/**
 * Function: showError(message)
 * Purpose: Show error notification
 */
function showError(message) {
  // In production, use a toast library
  alert('❌ ' + message);
}

/**
 * Function: getPixelIdFromModal()
 * Purpose: Extract pixel ID from modal content
 */
function getPixelIdFromModal() {
  // Find pixel by coordinates in allPixels array
  const coords = document.getElementById('modalCoords').textContent;
  const match = coords.match(/\((\d+),\s*(\d+)\)/);
  if (match) {
    const x = parseInt(match[1]);
    const y = parseInt(match[2]);
    const pixel = allPixels.find(p => p.x === x && p.y === y);
    return pixel ? pixel.id : null;
  }
  return null;
}
