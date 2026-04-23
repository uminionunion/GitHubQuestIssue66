3️⃣ Complete README
README.md
markdown


# 🎨 Million Pixel Grid - Full Stack Application
A dynamic web application where users can purchase pixels on a 1000x1000 grid. Each pixel starts at $2 and doubles in price with each purchase (up to 10 times maximum). Users can color their purchased pixels and track ownership through a personal dashboard.
## 📋 Features
- ✅ 1000x1000 pixel grid (1,000,000 pixels)
- ✅ Canvas-based rendering for performance
- ✅ User authentication (register/login)
- ✅ Stripe payment integration
- ✅ Pixel ownership and color customization
- ✅ User dashboard showing owned pixels
- ✅ Webhook-based payment confirmation
- ✅ Price doubling on each purchase
- ✅ Maximum 10 purchases per pixel
- ✅ Fully commented beginner-friendly code
---
## 🛠️ Tech Stack
**Frontend:**
- HTML5
- CSS3 (with responsive design)
- Vanilla JavaScript
- Canvas API for rendering
- Stripe.js
**Backend:**
- Node.js
- Express.js
- SQLite3
- Stripe API
- JSON Web Tokens (JWT)
**Database:**
- SQLite (lightweight, file-based)
**Payments:**
- Stripe (payment processing)
- Stripe Webhooks (server-to-server confirmation)
---
## 📁 Project Structure
million-pixel-grid/ │ ├── frontend/ # Frontend files │ ├── index.html # Main HTML page │ ├── style.css # Styling │ ├── script.js # Frontend logic │ └── dashboard.html # User dashboard (optional) │ ├── backend/ # Backend files │ ├── server.js # Main server entry point │ ├── db.js # Database setup and queries │ ├── auth.js # User authentication │ ├── pixels.js # Pixel logic and Stripe integration │ ├── stripe-webhook.js # Webhook handling │ ├── middleware.js # Express middleware │ ├── package.json # Node dependencies │ └── .env.example # Environment variables template │ ├── database/ # Database files │ ├── schema.sql # Database structure documentation │ └── million-pixel.db # SQLite database (created automatically) │ ├── README.md # This file └── stripe-webhook-test.js # Testing webhook locally (optional)



---
## 🚀 Quick Start
### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Stripe account (free tier works)
- Basic understanding of command line
### Step 1: Clone/Download
USER

Continue

ASSISTANT

Continuing from README...
README.md (continued)
markdown


### Step 1: Clone/Download
```bash
# Download the files to your computer
cd million-pixel-grid
Step 2: Install Backend Dependencies
bash


cd backend
npm install
This installs all required Node.js packages:

express (web server framework)
sqlite3 (database)
bcryptjs (password encryption)
jsonwebtoken (user sessions)
stripe (payment processing)
cors (cross-origin requests)
dotenv (environment variables)
Step 3: Set Up Environment Variables
Create a .env file in the backend/ folder:

bash


# Copy the example file
cp .env.example .env
# Then edit .env and fill in your values
What to add to .env:

env


PORT=5000
NODE_ENV=development
DB_PATH=./database/million-pixel.db
JWT_SECRET=your_super_secret_key_change_this_in_production_12345
JWT_EXPIRY=7d
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
Step 4: Get Stripe API Keys
Create Stripe Account:
Go to https://stripe.com
Click "Sign up"
Complete registration
Find Your API Keys:
Log in to Stripe Dashboard
Go to "Developers" → "API keys"
You'll see:
Publishable key (starts with pk_test_)
Secret key (starts with sk_test_)
Copy these to your .env file
Create Webhook Endpoint:
In Stripe Dashboard, go to "Developers" → "Webhooks"
Click "Add endpoint"
Endpoint URL: http://localhost:5000/api/webhook/stripe
Events to listen for: checkout.session.completed
Copy the webhook secret (starts with whsec_)
Add to .env
Step 5: Start Backend Server
bash


# From backend/ folder
npm start
# You should see:
# ╔════════════════════════════════════════╗
# ║  🎨 MILLION PIXEL GRID SERVER RUNNING  ║
# ╚════════════════════════════════════════╝
#
#   ✨ Frontend: http://localhost:3000
#   🔧 Backend:  http://localhost:5000
#   💾 Database: ./database/million-pixel.db
First run will take ~30 seconds to create and populate 1,000,000 pixels. ⏳

Step 6: Start Frontend
Open another terminal:

bash


# Navigate to frontend folder
cd frontend
# Start a simple web server
# Using Python 3:
python -m http.server 3000
# OR using Python 2:
python -m SimpleHTTPServer 3000
# OR using Node (install http-server first):
npm install -g http-server
http-server -p 3000
The frontend will be available at: http://localhost:3000

Step 7: Test the Application
Open browser: http://localhost:3000
Register a new account:
Click "Register"
Enter email and password
Click "Register"
Purchase a pixel:
Click any pixel on the grid
Click "Purchase Pixel - $2.00"
Fill in Stripe test card: 4242 4242 4242 4242
Use any future date and CVC
Complete payment
Color your pixel:
Purchased pixel should appear in your dashboard
Click it to change the color
✅ If everything works, you're done!

📊 Database Structure
Users Table
Stores user accounts.



id (Primary Key)    | email                  | password_hash         | created_at
1                   | john@example.com       | $2a$10\$xxxxx...       | 2024-01-01 10:00
2                   | jane@example.com       | $2a$10\$yyyyy...       | 2024-01-02 15:30
Creating users:

Done automatically via /api/auth/register endpoint
Password is hashed with bcrypt (one-way encryption)
Pixels Table
Stores data for all 1,000,000 pixels.



id      | x   | y   | color    | current_price | purchase_count | owner_user_id | color_changes_available
1000001 | 0   | 1   | #FF0000  | 8             | 2              | 1             | 2
1000002 | 1   | 1   | NULL     | 2             | 0              | NULL          | 0
Key fields:

x, y: Coordinates on the 1000x1000 grid
color: Hex color code (e.g., "#FF0000")
current_price: Price in cents (200 = $2.00)
purchase_count: Number of times purchased (0-10)
owner_user_id: Which user owns it (NULL = unowned)
color_changes_available: How many more color changes user can make
Purchases Table
Records every transaction.



id  | user_id | pixel_id | price_paid | purchase_number | stripe_session_id | timestamp
1   | 1       | 1000001  | 200        | 1               | cs_test_xxxxx...  | 2024-01-15 09:30
2   | 1       | 1000001  | 400        | 2               | cs_test_yyyyy...  | 2024-01-15 09:35
3   | 2       | 1000005  | 200        | 1               | cs_test_zzzzz...  | 2024-01-15 10:00
Purpose:

Audit trail of all purchases
Track who bought what and when
Useful for analytics and debugging
💳 Payment Flow
How Stripe Integration Works


User clicks "Buy Pixel"
    ↓
Frontend requests checkout session from backend
    ↓
Backend creates Stripe checkout session (sends price + metadata)
    ↓
User redirected to Stripe checkout page
    ↓
User enters card details and pays
    ↓
Stripe processes payment
    ↓
Stripe sends webhook to backend: /api/webhook/stripe
    ↓
Backend verifies webhook signature (ensure it's really Stripe)
    ↓
Backend updates database:
  - Increment purchase_count
  - Double current_price
  - Update owner_user_id
  - Record in purchases table
  - Grant 1 color change
    ↓
User gets success confirmation
Test Payment Details
Use these card numbers to test (won't charge):



Card Number	Result
4242 4242 4242 4242	Successful payment
4000 0000 0000 0002	Payment declined
4000 0000 0000 0341	3D Secure required
Use any future date (e.g., 12/25) and any 3-digit CVC.

🔐 API Endpoints
Authentication
POST /api/auth/register

Create new user account
Body: { email, password }
Returns: { token, user }
POST /api/auth/login

Authenticate and get token
Body: { email, password }
Returns: { token, user }
Pixels
GET /api/pixels/all

Get all pixels
Returns: Array of 1,000,000 pixels
GET /api/pixels/:x/:y

Get specific pixel
Returns: Pixel object
POST /api/pixels/:id/create-checkout

Create Stripe checkout session for purchase
Auth: Required (Bearer token)
Body: { price, purchase_count, x, y }
Returns: { sessionId }
POST /api/pixels/:id/color

Update pixel color
Auth: Required
Body: { color: "#FFFFFF" }
Returns: Updated pixel
GET /api/user/pixels

Get all pixels owned by logged-in user
Auth: Required
Returns: Array of user's pixels
Webhooks
POST /api/webhook/stripe

Receives payment confirmation from Stripe
No auth needed (Stripe signature verified)
Automatically updates database
🧪 Testing Webhook Locally
When testing locally, Stripe can't reach http://localhost:5000. Use Stripe CLI:

Install Stripe CLI
macOS:

bash


brew install stripe/stripe-cli/stripe
Windows:

bash


choco install stripe
Linux:

bash


curl https://files.stripe.com/stripe-cli/releases/linux/v1.17.4/stripe_linux_x86_64.tar.gz | tar -xz
Start Webhook Forwarding
bash


stripe listen --forward-to localhost:5000/api/webhook/stripe
You'll see:



> Ready! Your webhook signing secret is: whsec_test_xxxxx...
Copy this secret to your .env file as STRIPE_WEBHOOK_SECRET.

Simulate Events
bash


stripe trigger checkout.session.completed
This simulates a payment without charging you.

📚 Code Structure Explained
Backend Flow
User registers/logs in (auth.js)
Password hashed with bcrypt
JWT token generated
Token stored in browser localStorage
User purchases pixel (pixels.js)
Click pixel → Get pixel data
Click "Purchase" → Create Stripe checkout session
Stripe processes payment
Payment succeeds (stripe-webhook.js)
Stripe sends webhook to backend
Backend verifies signature (ensure it's real)
Database updated atomically
User can now color the pixel
User changes color (pixels.js)
POST request with new hex color
Backend validates ownership and available changes
Update database and re-render canvas
Frontend Flow
Page loads (script.js → init())
Restore user session from localStorage
Load all 1,000,000 pixels from backend
Render canvas
User hovers pixel
Show tooltip with coordinates
User clicks pixel
Show modal with pixel info
Show action button (buy/color/login)
User buys pixel
Redirect to Stripe
After payment, page reloads
Pixel shows in dashboard
🐛 Troubleshooting
"Cannot find module" error
bash


# Make sure you installed dependencies
cd backend
npm install
"Port 5000 already in use"
bash


# Use a different port (edit .env)
# Then restart server
"Database is locked"
bash


# SQLite sometimes locks during bulk operations
# Solution: Wait a few seconds and refresh browser
Webhook not working locally
bash


# Make sure Stripe CLI is forwarding:
stripe listen --forward-to localhost:5000/api/webhook/stripe
# Check that STRIPE_WEBHOOK_SECRET in .env matches CLI output
Payment succeeds but pixel doesn't update
bash


# 1. Check backend console for errors
# 2. Verify STRIPE_WEBHOOK_SECRET is correct
# 3. Try webhook again with:
stripe trigger checkout.session.completed
# 4. Check database directly:
sqlite3 database/million-pixel.db
sqlite> SELECT * FROM pixels WHERE x=0 AND y=0;
Canvas is blank
bash


# 1. Check browser console (F12) for errors
# 2. Make sure backend is running
# 3. Wait for pixels to load (first load takes ~30 seconds)
# 4. Hard refresh (Ctrl+Shift+R)
🚀 Deployment
Deploy to Heroku (Backend)
Create Heroku account: https://heroku.com
Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
bash


# Login to Heroku
heroku login
# Create app
heroku create your-app-name
# Add buildpack for Node.js
heroku buildpacks:add heroku/nodejs
# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set JWT_SECRET=your_secret_key
# ... etc
# Deploy
git push heroku main
# View logs
heroku logs --tail
Deploy Frontend to Netlify
Sign up: https://netlify.com
Upload frontend folder
Set environment variables
Update API_BASE in script.js to production URL
📖 Learning Resources
Understanding the Code
JWT Authentication: https://jwt.io/introduction
Stripe Webhooks: https://stripe.com/docs/webhooks
Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
SQLite: https://www.sqlite.org/docs.html
Express.js: https://expressjs.com/
Video Tutorials
Node.js Basics: https://www.youtube.com/watch?v=TlB_eWDSMt4
Stripe Integration: https://www.youtube.com/watch?v=m2o7ZO73ieA
Canvas Drawing: https://www.youtube.com/watch?v=ZiYMk_bJjMQ
🤝 Contributing
Want to improve this project? Here are some ideas:

 Add pixel search/filtering
 Implement pixel leaderboard
 Add animations/effects
 Create mobile app
 Add real-time pixel updates (WebSockets)
 Implement pixel trading/gifting
 Add user profiles
 Create analytics dashboard
 Optimize database queries
 Add Redis caching
📝 License
This project is open source and available under the MIT License.

❓ FAQ
How long does it take to load all pixels?
First run: ~30 seconds (creating 1M pixels) Subsequent runs: ~2-3 seconds (loading from database)

Can pixels be purchased multiple times?
Yes! Each pixel can be purchased up to 10 times. Price doubles each time:

Purchase 1: $2.00
Purchase 2: $4.00
Purchase 3: $8.00
...
Purchase 10: $1,024.00
What's the maximum cost to buy a pixel 10 times?
2
+
2+4 + 
8
+
8+16 + 
32
+
32+64 + 
128
+
128+256 + 
512
+
512+1,024 = $2,046.00

Can I change colors without purchasing again?
No. Each purchase gives 1 color change. To get more color changes, you must purchase the pixel again (which doubles the price).

Is this GDPR compliant?
This is a demo app. For production, you'd need:

Privacy policy
Terms of service
Cookie consent
Data deletion endpoints
GDPR compliance review
Why use Canvas instead of DOM elements?
Performance: Canvas renders 1M pixels in ~16ms
DOM: Would require 1M HTML elements (crashes browser)
Memory: Canvas uses minimal memory
Speed: Redraws happen at 60fps
Can I run this without Stripe?
Yes! Remove Stripe-related code and add dummy payment logic. But you won't process real payments.

📞 Support
Having issues? Try these steps:

Check the error message - it usually tells you what's wrong
Check the console - Browser (F12) and backend console
Check the logs - Look at terminal output
Check .env file - Make sure all keys are correct
Hard refresh - Ctrl+Shift+R (or Cmd+Shift+R on Mac)
Restart servers - Stop and start backend/frontend
If still stuck, check the troubleshooting section above.

🎉 You're All Set!
Your Million Pixel Grid application is ready to go!

Next steps:

Customize colors/styling
Add more features
Deploy to production
Share with friends!
Happy coding! 🚀