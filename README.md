# 🎨 Million Pixel Grid - Full Stack Application

A dynamic web application where users can **purchase PixelTickets** and use them to **change pixel colors** on a 1000x1000 grid. Each pixel can be changed up to 10 times with exponentially increasing costs (1, 2, 4, 8, 16, 32, 64, 128, 256, 512 PixelTickets).

## 📋 Features

### Core Features
- ✅ 1000x1000 pixel grid (1,000,000 pixels)
- ✅ Canvas-based rendering for performance
- ✅ User authentication (register/login)
- ✅ Stripe payment integration
- ✅ **9 colored ticket types** (Black, Purple, Emerald, Ruby, Sapphire, Silver, Gold, Diamond, Double Diamond)
- ✅ **Ticket-based system** (buy tickets, use to change pixels)
- ✅ **Exponential pricing** (1→2→4→8→16→32→64→128→256→512 PixelTickets per change)
- ✅ **History pages** (view pixels at change #1-10)
- ✅ User ticket inventory display
- ✅ Webhook-based payment confirmation
- ✅ Maximum 10 color changes per pixel
- ✅ Fully commented beginner-friendly code

### Payment Flow
- ✅ Buy tickets with Stripe
- ✅ Use tickets to change pixel colors
- ✅ Track ticket inventory in real-time
- ✅ Automatic ticket deduction on color change
- ✅ Stripe webhook verification for security

### Advanced Features
- ✅ Progressive pixel loading (1M pixels in ~2-3 seconds)
- ✅ Parallel API requests for speed
- ✅ Dark mode support
- ✅ Fully responsive mobile design
- ✅ Accessibility features (high contrast, reduced motion)
- ✅ Docker & Docker Compose support

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5
- CSS3 (responsive, dark mode, accessibility)
- Vanilla JavaScript (no frameworks)
- Canvas API for rendering
- Stripe.js for payments

**Backend:**
- Node.js
- Express.js
- SQLite3 (lightweight database)
- Stripe API
- JSON Web Tokens (JWT)
- bcryptjs (password hashing)

**DevOps:**
- Docker & Docker Compose
- Nginx (frontend)
- Alpine Linux (lightweight)

**Database:**
- SQLite (file-based, zero-config)

**Payments:**
- Stripe (payment processing & webhooks)

---


## 📁 Project Structure
million-pixel-grid/ │ ├── frontend/ │ ├── index.html # Main page │ ├── style.css # Styling (responsive + dark mode) │ └── script.js # Frontend logic │ ├── backend/ │ ├── server.js # Express server setup │ ├── db.js # Database initialization │ ├── auth.js # User authentication │ ├── pixels.js # Pixel color changes │ ├── tickets.js # Ticket system │ ├── stripe-webhook.js # Webhook handling │ ├── middleware.js # Express middleware │ ├── package.json # Dependencies │ └── .env.example # Environment variables template │ ├── database/ │ └── million-pixel.db # SQLite database (auto-created) │ ├── Dockerfile # Backend container ├── Dockerfile.frontend # Frontend container ├── docker-compose.yml # Multi-container orchestration ├── default.conf # Nginx config ├── HowToSetUpWebhook.md # Webhook setup guide ├── README.md # This file └── .gitignore



---
## 🚀 Quick Start
### Prerequisites
- Node.js (v14+)
- npm
- Stripe account (free tier works)
- Docker & Docker Compose (optional, but recommended)
### Option A: Local Development (Without Docker)
#### Step 1: Install Dependencies
```bash
cd backend
npm install
Step 2: Set Up Environment Variables
bash


# Copy example file
cp .env.example .env
# Edit .env with your values
# Follow the instructions in the file
Step 3: Get Stripe Keys
Go to https://dashboard.stripe.com
Go to "Developers" → "API Keys"
Copy your keys to .env:
STRIPE_SECRET_KEY = sk_test_...
STRIPE_PUBLISHABLE_KEY = pk_test_...
Step 4: Set Up Webhook
See HowToSetUpWebhook.md for complete instructions

Step 5: Start Backend
bash


npm start
Wait for message:



🎨 MILLION PIXEL GRID SERVER RUNNING
✨ Frontend: http://localhost:3000
🔧 Backend:  http://localhost:5000
💾 Database: ./database/million-pixel.db
Step 6: Start Frontend (new terminal)
bash


cd frontend
# Using Python 3:
python -m http.server 3000
# Or using Node:
npm install -g http-server
http-server -p 3000
Step 7: Open in Browser


http://localhost:3000
Option B: Using Docker Compose (Recommended)
Step 1: Update docker-compose.yml
Replace placeholder values:

yaml


environment:
  - STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
  - STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
  - STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
  - FRONTEND_URL=http://YOUR_IP:5001
Step 2: Start Containers
bash


docker-compose up -d
Step 3: Check Logs
bash


docker-compose logs -f backend
Step 4: Access Application


Frontend: http://localhost:5001
Backend:  http://localhost:5000
Step 5: Stop Containers
bash


docker-compose down
📊 Database Structure
Users Table
Stores user accounts



Field	Type	Description
id	INTEGER	Primary key
email	TEXT	User email (unique)
password_hash	TEXT	Encrypted password
created_at	DATETIME	Account creation date
Pixels Table
Stores all 1,000,000 pixels



Field	Type	Description
id	INTEGER	Primary key
x	INTEGER	X coordinate (0-999)
y	INTEGER	Y coordinate (0-999)
color	TEXT	Hex color (#FFFFFF)
change_count	INTEGER	Times changed (0-10)
next_cost_tickets	INTEGER	Cost for next change
last_changed_by	INTEGER	User ID of last changer
last_changed_at	DATETIME	When last changed
Pixel History Table (NEW)
Tracks every color change



Field	Type	Description
id	INTEGER	Primary key
pixel_x	INTEGER	Pixel X coordinate
pixel_y	INTEGER	Pixel Y coordinate
change_number	INTEGER	Which change (1-10)
color	TEXT	Color at that change
changed_by_user_id	INTEGER	User ID
changed_at	DATETIME	When changed
This allows the History Pages feature (view pixels at change #1-10)

User Tickets Table (NEW)
Tracks user's ticket inventory



Field	Type	Description
id	INTEGER	Primary key
user_id	INTEGER	Which user
blackTickets	INTEGER	Count
purpleTickets	INTEGER	Count
emeraldTickets	INTEGER	Count
rubyTickets	INTEGER	Count
sapphireTickets	INTEGER	Count
silverTickets	INTEGER	Count
goldTickets	INTEGER	Count
diamondTickets	INTEGER	Count
doublediamondTickets	INTEGER	Count
total_pixeltickets	INTEGER	Sum of all
created_at	DATETIME	When created
updated_at	DATETIME	Last update
Example:



user_id=5:
  blackTickets: 10 (= 10 PixelTickets)
  diamondTickets: 1 (= 500 PixelTickets)
  total_pixeltickets: 510
Ticket Purchases Table (NEW)
Audit trail of all purchases



Field	Type	Description
id	INTEGER	Primary key
user_id	INTEGER	Who bought
ticket_type	TEXT	Which ticket
quantity	INTEGER	How many
total_cost_cents	INTEGER	Price in cents
stripe_session_id	TEXT	Stripe reference
status	TEXT	pending/completed
created_at	DATETIME	When created
completed_at	DATETIME	When paid
💳 Payment Flow
Buying Tickets (NEW SYSTEM)


User clicks "Buy Tickets"
    ↓
Shows ticket shop (9 types)
    ↓
Selects Diamond Ticket, quantity 1
    ↓
Clicks "Buy"
    ↓
Backend creates Stripe checkout session
  - Item: "1x Diamond Ticket"
  - Price: \$1,000.00
  - Metadata: userId, ticketType, quantity
    ↓
Frontend redirects to Stripe checkout
    ↓
User enters card: 4242 4242 4242 4242
    ↓
Stripe processes payment
    ↓
✅ PAYMENT SUCCEEDS
    ↓
Stripe sends webhook to /api/webhook/stripe
    ↓
Backend verifies webhook signature
    ↓
Backend adds tickets to user_tickets table
  - diamondTickets: +1
  - total_pixeltickets: +500
    ↓
User now has 500 PixelTickets to spend!
Using Tickets to Change Pixels


User clicks pixel
    ↓
Shows pixel info modal
    ↓
Shows: "Cost to change: 2 PixelTickets"
       "You have: 510 PixelTickets"
    ↓
User selects new color
    ↓
Clicks "Change Color - 2 PixelTickets"
    ↓
Backend deducts 2 tickets
  - total_pixeltickets: 510 → 508
    ↓
Backend updates pixel color
    ↓
Backend records in pixel_history
  - change_number: 2
  - color: #FF0000
  - user_id: 5
    ↓
✅ Pixel color changed!
    ↓
User sees updated canvas
    ↓
User's inventory updates: "510 → 508"
🎟️ Ticket System
9 Ticket Types
Each ticket type has a value in "PixelTickets":



Ticket	Icon	Value	Price
Black	🔵	1	$2.00
Purple	🟣	5	$10.00
Emerald	🟢	10	$20.00
Ruby	🔴	25	$50.00
Sapphire	🔵	50	$100.00
Silver	⚪	100	$200.00
Gold	🟡	250	$500.00
Diamond	💎	500	$1,000.00
Double Diamond	💠	1,000	$2,000.00
Cost to Change Pixels
Each time you change a pixel, it costs more:



Change #	Cost	Total for all changes up to this point
1st	1	1
2nd	2	3
3rd	4	7
4th	8	15
5th	16	31
6th	32	63
7th	64	127
8th	128	255
9th	256	511
10th	512	1,023
To change one pixel 10 times, you need 1,023 PixelTickets

How to Get Enough Tickets
Example: Want to change a pixel 10 times?

Need: 1,023 PixelTickets

Buy:

1x Double Diamond (1,000) = $2,000
1x Emerald (10) = $20
1x Emerald (10) = $20
3x Black (1 each) = $6
Total: 1,023 PixelTickets for $2,046
🔐 API Endpoints
Authentication


POST /api/auth/register
  Body: { email, password }
  Returns: { token, user }
POST /api/auth/login
  Body: { email, password }
  Returns: { token, user }
Pixels


GET /api/pixels/all?start=0&limit=1000
  Returns: Array of pixels (paginated)
GET /api/pixels/:x/:y
  Returns: Single pixel data
POST /api/pixels/:x/:y/change
  Auth: Required (Bearer token)
  Body: { color: "#FF0000" }
  Returns: Updated pixel + new ticket count
  Status 402: Insufficient funds
GET /api/pixels/:x/:y/history
  Returns: All color changes for pixel
GET /api/pixels/history/:page
  Page 1-10: Pixels at that change number
  Returns: All 1M pixels at that page
Tickets (NEW)


POST /api/tickets/buy
  Auth: Required
  Body: { ticketType: "diamondTicket", quantity: 1 }
  Returns: { sessionId, price, displayName, pixelTicketsTotal }
GET /api/user/inventory
  Auth: Required
  Returns: {
    blackTickets: 5,
    purpleTickets: 2,
    ...
    total_pixeltickets: 540
  }
Webhooks


POST /api/webhook/stripe
  No auth (Stripe signature verified)
  Auto-processes payment, adds tickets
  Returns: { received: true }
🧪 Testing
Test Card Numbers


Card	Result
4242 4242 4242 4242	✅ Success
4000 0000 0000 0002	❌ Declined
4000 0000 0000 0341	⚠️ 3D Secure
Use any future date and any 3-digit CVC.

Test Workflow
Go to http://localhost:3000
Register new account
Click "Buy Tickets"
Select Diamond Ticket, quantity 1
Click "Buy"
Enter test card: 4242 4242 4242 4242
Click "Pay"
Check inventory: Should show "+1 Diamond (500)"
Click any pixel
Select color, click "Change Color"
Confirm: Pixel changed, tickets deducted
🚀 Deployment
Deploy Backend to Heroku
bash


# Create app
heroku create your-app-name
# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_test_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set JWT_SECRET=\$(openssl rand -base64 32)
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://yourdomain.com
# Deploy
git push heroku main
# View logs
heroku logs --tail
Deploy Frontend to Netlify
bash


# Connect GitHub repo to Netlify
# Or drag & drop frontend folder
Update Stripe Webhook URLs
In Stripe Dashboard, update webhook endpoints:

Test Mode:

http://localhost:5000/api/webhook/stripe
Production:

https://your-backend.herokuapp.com/api/webhook/stripe
Docker Compose:

Update docker-compose.yml with your domain
Run: docker-compose up -d
Update Stripe to new webhook URL
🐛 Troubleshooting
Payment doesn't add tickets
Check backend logs: Look at terminal output
Verify STRIPE_WEBHOOK_SECRET matches Stripe CLI
Make sure Stripe CLI is forwarding: stripe listen --forward-to localhost:5000/api/webhook/stripe
See HowToSetUpWebhook.md for complete guide
Canvas is blank
Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
Check browser console: F12 → Console tab
Make sure backend is running: npm start
Wait for pixel loading (first load: ~30 seconds)
"Cannot find module" error
bash


cd backend
npm install
npm start
"Port 5000 already in use"
bash


# Use different port (edit .env)
PORT=5001
# Or kill process using port
# macOS/Linux:
lsof -i :5000
kill -9 <PID>
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
Database locked error
Wait 30 seconds and refresh
This happens during first-time pixel creation
Don't interrupt npm start during initialization
Webhook not working
See HowToSetUpWebhook.md for complete instructions
Common issues:
STRIPE_WEBHOOK_SECRET doesn't match
Stripe CLI not running
Backend not running
Wrong webhook URL in Stripe Dashboard
User not found on payment
Make sure user is logged in before buying
Check that userId in Stripe metadata is correct
Verify user exists in database
Pixel color doesn't change
Refresh page (Ctrl+R)
Check you have enough PixelTickets
Check browser console for errors
Make sure you're logged in
📚 Learning Resources
Understanding the Code
JWT Authentication: https://jwt.io/introduction
Stripe Webhooks: https://stripe.com/docs/webhooks
Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
SQLite: https://www.sqlite.org/docs.html
Express.js: https://expressjs.com/
Docker: https://docs.docker.com/get-started/
Video Tutorials
Node.js Basics: https://www.youtube.com/watch?v=TlB_eWDSMt4
Stripe Integration: https://www.youtube.com/watch?v=m2o7ZO73ieA
Canvas Drawing: https://www.youtube.com/watch?v=ZiYMk_bJjMQ
Docker Basics: https://www.youtube.com/watch?v=3c-iBn73dLA
Documentation
Stripe API: https://stripe.com/docs/api
Express.js: https://expressjs.com/
SQLite: https://www.sqlite.org/docs.html
Node.js: https://nodejs.org/docs/
🤝 Contributing
Want to improve this project? Ideas:

 Add pixel search/filtering
 Implement pixel leaderboard (top changers)
 Add animations/effects
 Create mobile app
 Add real-time updates (WebSockets)
 Implement pixel trading/gifting
 Add user profiles
 Create analytics dashboard
 Optimize database queries
 Add Redis caching
 Add email notifications
 Implement referral system
 Add pixel comments/notes
📝 License
This project is open source and available under the MIT License.

❓ FAQ
How long does it take to load all pixels?
First run: ~30 seconds (creating 1M pixels)
Subsequent runs: ~2-3 seconds (loading from database)
How do pixels get changed?
Users buy tickets, then use them to change pixels. The more times a pixel is changed, the more expensive it becomes.

What's the maximum cost to change a pixel 10 times?
1 + 2 + 4 + 8 + 16 + 32 + 64 + 128 + 256 + 512 = 1,023 PixelTickets

How many ticket types are there?
9 colored tickets:

Black (1 PixelTicket)
Purple (5)
Emerald (10)
Ruby (25)
Sapphire (50)
Silver (100)
Gold (250)
Diamond (500)
Double Diamond (1,000)
Can I change a pixel without buying first?
No. You must buy tickets first, then use them to change pixels. Each change uses up tickets.

Is there a leaderboard?
Not yet! You could add one showing:

Most pixels changed
Most PixelTickets spent
Most unique pixels changed
Can pixels be bought back?
In the current system, pixels don't have "owners" who can re-sell. Users just buy tickets and change colors.

Is this GDPR compliant?
This is a demo app. For production, you'd need:

Privacy policy
Terms of service
Cookie consent
Data deletion endpoints
GDPR compliance review
Why use Canvas instead of DOM?
Performance: Canvas renders 1M pixels in ~16ms
DOM: Would require 1M HTML elements (crashes browser)
Memory: Canvas uses minimal memory
Speed: Redraws happen at 60fps
Can I run this without Stripe?
Yes! Remove Stripe code and add dummy payment logic. But you won't process real payments.

Where is pixel history stored?
In the pixel_history table:

bash


sqlite3 database/million-pixel.db
sqlite> SELECT * FROM pixel_history WHERE pixel_x=5 AND pixel_y=10;
Can I export pixel data?
Yes! SQLite can export to CSV:

bash


sqlite3 database/million-pixel.db
sqlite> .mode csv
sqlite> .output pixels.csv
sqlite> SELECT * FROM pixels;
sqlite> .quit
How do I backup the database?
bash


# Simple copy
cp database/million-pixel.db database/million-pixel.db.backup
# Or with SQLite
sqlite3 database/million-pixel.db ".backup database/million-pixel.db.backup"
Can multiple users change the same pixel?
Yes! Each pixel can be changed up to 10 times by different users. History shows who changed it and when.

What happens at change #11?
The pixel is "maxed out" - no more changes allowed. Users see message: "This pixel has reached maximum changes (10)."

📞 Support
Having issues? Try these steps:

Read the error - It usually tells you what's wrong
Check console - Browser (F12) and backend terminal
Check logs - Look at terminal output
Check .env - Make sure all keys are correct
Hard refresh - Ctrl+Shift+R (or Cmd+Shift+R on Mac)
Restart servers - Stop and start everything
Check database - Use SQLite directly:
bash


sqlite3 database/million-pixel.db
sqlite> .tables
sqlite> SELECT COUNT(*) FROM pixels;
If still stuck:

Check HowToSetUpWebhook.md for webhook issues
Check backend console output
Verify .env values
Look at browser console (F12)
🎉 You're All Set!
Your Million Pixel Grid application is ready to go!

Next Steps:
✅ Set up environment variables
✅ Get Stripe API keys
✅ Configure webhook (see HowToSetUpWebhook.md)
✅ Start backend: npm start
✅ Start frontend: python -m http.server 3000
✅ Test with test card: 4242 4242 4242 4242
✅ Deploy to production
Optional Enhancements:
Add toast notifications (replace alerts)
Add user profile page
Add leaderboard
Add analytics
Add referral system
Add pixel search
Add real-time updates
📖 File-by-File Guide
Frontend Files
index.html

Main page structure
Modals for pixel info, tickets, auth
Canvas element for grid
Script imports
style.css

800+ lines of styling
Responsive design (mobile to desktop)
Dark mode support
Accessibility features
Animations and transitions
script.js

1000+ lines of JavaScript
Canvas rendering
User authentication
Pixel interaction
Ticket purchase flow
History page navigation
Heavy comments for learning
Backend Files
server.js

Express setup
All route definitions
Middleware configuration
Server startup
db.js

SQLite initialization
Table creation (schema)
Helper functions for queries
Database setup on startup
auth.js

User registration
User login
Password hashing (bcrypt)
JWT token generation
pixels.js

Get pixel data
Change pixel color
Validate color changes
Calculate costs
Get pixel history
tickets.js

Stripe checkout session
Get user inventory
Add tickets to user
Calculate totals
Validate ticket types
stripe-webhook.js

Receive webhook from Stripe
Verify webhook signature
Extract payment metadata
Update database
Add tickets to user
middleware.js

JWT verification
Error handling
CORS setup
Happy coding! 🚀