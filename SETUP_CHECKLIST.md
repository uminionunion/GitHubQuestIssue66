# Setup Checklist

Follow this step-by-step to get everything working:

## ✅ Prerequisites
- [ ] Node.js installed (check: `node -v`)
- [ ] npm installed (check: `npm -v`)
- [ ] Stripe account created (https://stripe.com)
- [ ] Stripe CLI installed (for webhook testing)

## ✅ Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install

Step 2: Create .env File
 Copy .env.example to .env
 Fill in all values:
env


PORT=5000
NODE_ENV=development
DB_PATH=./database/million-pixel.db
JWT_SECRET=your_secret_key_here_min_32_chars
JWT_EXPIRY=7d
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
Step 3: Start Backend
bash


npm start
# Should see:
# ✅ Connected to SQLite database
# 📊 Populating 1,000,000 pixels...
# ✅ All pixels created
# 🎨 MILLION PIXEL GRID SERVER RUNNING
Wait for "All pixels created" message (~30 seconds on first run).

✅ Frontend Setup
Step 1: Update Stripe Key
 Open frontend/script.js
 Find this line: const stripe = Stripe('pk_test_YOUR_KEY');
 Replace with your publishable key
Step 2: Start Web Server
bash


cd frontend
# Python 3:
python -m http.server 3000
# OR Python 2:
python -m SimpleHTTPServer 3000
# OR Node:
npm install -g http-server
http-server -p 3000
Step 3: Open Browser
 Go to http://localhost:3000
 You should see the pixel grid loading
✅ Stripe Webhook Setup (for testing)
Step 1: Install Stripe CLI
 Download from https://stripe.com/docs/stripe-cli
Step 2: Start Forwarding
bash


stripe login
# Login with your account
stripe listen --forward-to localhost:5000/api/webhook/stripe
# Copy the whsec_... secret
Step 3: Update .env
 Add webhook secret to .env
Step 4: Restart Backend
bash


npm start
✅ Test Payment Flow
Step 1: Register User
 Click "Register"
 Use test email (e.g., test@example.com)
 Use password (e.g., testpass123)
 Confirm registered
Step 2: Buy Pixel
 Click any pixel on grid
 Click "Purchase Pixel"
 You're redirected to Stripe
Step 3: Enter Test Card
 Card: 4242 4242 4242 4242
 Date: Any future date (e.g., 12/25)
 CVC: Any 3 digits (e.g., 123)
 Click "Pay"
Step 4: Check Result
 Page redirects to success URL
 Check browser console (F12) for errors
 Check backend console for webhook confirmation
 Refresh frontend and check if pixel appears in dashboard
✅ Troubleshooting
Backend won't start
bash


# Check if port 5000 is in use
# Try: kill -9 \$(lsof -t -i :5000)
# Then: npm start
Database "locked" error
bash


# Wait 30 seconds and try again
# Or: rm database/million-pixel.db
# Then: npm start (recreates it)
Webhook not working
bash


# Make sure Stripe CLI is running in another terminal
stripe listen --forward-to localhost:5000/api/webhook/stripe
# Webhook secret in .env matches CLI output
# Then restart backend: npm start
Canvas is blank
bash


# Check browser console (F12) for errors
# Make sure backend is running
# Wait for pixels to load (check console logs)
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
✅ You're Done!
If you got this far, everything should be working! 🎉

Next steps:

 Customize colors and styling
 Deploy to production
 Add more features
 Share with users!


---
## Summary
You now have a **complete, production-ready Million Pixel Grid application** with:
### ✅ What's Included
1. **Fully Commented Backend**
   - Express server with all routes
   - SQLite database setup
   - User authentication (bcrypt + JWT)
   - Stripe payment integration
   - Webhook handling
   - Price doubling logic
   - Color change management
2. **Fully Commented Frontend**
   - HTML/CSS/JavaScript
   - Canvas rendering (1M pixels)
   - User authentication UI
   - Pixel interaction (hover/click)
   - Stripe.js integration
   - User dashboard
   - Modals and forms
3. **Database**
   - SQLite schema
   - Users, Pixels, Purchases tables
   - Automatic 1M pixel generation
   - Proper indexes
4. **Documentation**
   - Complete README
   - Step-by-step setup guide
   - Troubleshooting section
   - API documentation
   - Testing instructions
   - FAQ
5. **Testing Tools**
   - Webhook testing script
   - Stripe CLI integration instructions
   - Test card numbers
### 🚀 To Get Started:
1. Copy all files to your computer
2. Follow the README setup instructions
3. Get Stripe API keys
4. Run backend: `npm start`
5. Run frontend: `python -m http.server 3000`
6. Visit http://localhost:3000
7. Test payment with 4242 4242 4242 4242
Everything is **beginner-friendly** with detailed comments explaining every line of code!