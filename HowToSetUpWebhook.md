# 🎟️ How to Set Up Stripe Webhooks for Ticket Purchases

This guide explains how to set up Stripe webhooks so your Million Pixel Grid system knows when users buy tickets.

## 📚 Table of Contents

1. [What is a Webhook?](#what-is-a-webhook)
2. [Why Do We Need Webhooks?](#why-do-we-need-webhooks)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Testing Your Webhook](#testing-your-webhook)
5. [Troubleshooting](#troubleshooting)
6. [Ticket Type Reference](#ticket-type-reference)

---

## 🔍 What is a Webhook?

A **webhook** is an automatic notification that Stripe sends to your server when something happens (like a payment succeeds).

### Simple Analogy:
Imagine you order pizza:
- **Without webhook:** You keep calling the pizza place asking "Is my pizza ready?"
- **With webhook:** Pizza place calls YOU when it's ready

Same concept with Stripe:
- **Without webhook:** Your server keeps asking Stripe "Did the payment succeed?"
- **With webhook:** Stripe tells your server "Payment succeeded!"

---

## ⚡ Why Do We Need Webhooks?
### Scenario Without Webhooks:
User clicks "Buy Ticket" ↓ Redirects to Stripe checkout ↓ User pays successfully ↓ User's browser crashes before returning ↓ ❌ Server never knows payment succeeded ❌ User doesn't get their tickets ❌ User is confused (paid but no tickets!)



### Scenario With Webhooks:
User clicks "Buy Ticket" ↓ Redirects to Stripe checkout ↓ User pays successfully ↓ User's browser crashes ↓ ✅ Stripe automatically sends webhook to server ✅ Server adds tickets to user's account ✅ User gets tickets even if browser crashed ✅ Payment is never lost



---
## 🚀 Step-by-Step Setup
### Step 1: Go to Stripe Dashboard
1. Open https://dashboard.stripe.com
2. Log in with your Stripe account
3. Make sure you're in **Test Mode** (you'll see a toggle at top)
### Step 2: Find Webhooks Section
1. Click **"Developers"** in left sidebar
2. Click **"Webhooks"** (under "Developers")
3. You'll see a section called "Endpoints"
### Step 3: Add Webhook Endpoint
1. Click **"Add endpoint"** button
2. A form appears asking for the URL
### Step 4: Enter Your Webhook URL
**If you're testing locally:**
http://localhost:5000/api/webhook/stripe



**If you deployed to production:**
https://yourdomain.com/api/webhook/stripe



**If using Heroku:**
https://your-app-name.herokuapp.com/api/webhook/stripe



**If using Docker/Docker Compose:**
http://backend:5000/api/webhook/stripe



(This only works when Docker containers can reach each other)
### Step 5: Select Events
After entering URL, Stripe asks "Which events should we send?"
✅ **Check ONLY this event:**
- `checkout.session.completed`
This means "Send a notification when a checkout session completes" (i.e., user pays)
❌ **Don't check:**
- Other events like payment_intent, charge events, etc.
- We only care about checkout completion
### Step 6: Create Endpoint
Click **"Add endpoint"** button
You'll see confirmation with your webhook details.
### Step 7: Copy Webhook Secret
You'll see a screen showing:
Endpoint ID: we_test_xxxxx... Signing secret: whsec_test_yyyyyyy...



**Copy the signing secret** (starts with `whsec_test_`)
### Step 8: Add to Environment Variables
Add to your `.env` file (or Docker environment):
```env
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE
Replace YOUR_SECRET_HERE with what you copied.

🧪 Testing Your Webhook
Option A: Test Locally with Stripe CLI (RECOMMENDED)
Install Stripe CLI
macOS:

bash


brew install stripe/stripe-cli/stripe
Windows (Chocolatey):

bash


choco install stripe
Windows (Manual):

Download from: https://github.com/stripe/stripe-cli/releases
Extract and run stripe.exe
Linux:

bash


curl https://files.stripe.com/stripe-cli/releases/linux/v1.17.4/stripe_linux_x86_64.tar.gz | tar -xz
sudo mv stripe /usr/local/bin
Start Webhook Forwarding
In a terminal, run:

bash


stripe listen --forward-to localhost:5000/api/webhook/stripe
You'll see output like:



> Ready! Your webhook signing secret is: whsec_test_xxxxx...
✅ This secret MUST match your .env STRIPE_WEBHOOK_SECRET

If it doesn't match, update your .env file and restart your backend.

Simulate a Payment
Open another terminal and run:

bash


stripe trigger checkout.session.completed
You'll see output like:



> Event created successfully: evt_test_xxxxx
> Forwarding to http://localhost:5000/api/webhook/stripe
Option B: Test with Real Payment
Make sure your backend is running
Go to frontend: http://localhost:5001
Log in or register
Click "Buy Tickets"
Select any ticket and quantity
Click "Buy" button
Use test card: 4242 4242 4242 4242
Use any future date (e.g., 12/25)
Use any CVC (e.g., 123)
Click "Pay"
Check your backend console for webhook receipt:



💰 Processing ticket purchase: User 1 bought 1x diamondTicket
✅ Tickets added to user 1
🎟️ Ticket Type Reference
This is how the 9 ticket types map to your system:

Black Ticket


Name: Black Ticket
Icon: 🔵
PixelTickets Value: 1
Price: \$2.00
Stripe Product: Created automatically
When user buys: +1 PixelTicket added to account
Purple Ticket


Name: Purple Ticket
Icon: 🟣
PixelTickets Value: 5
Price: \$10.00
Stripe Product: Created automatically
When user buys: +5 PixelTickets added to account
Emerald Ticket


Name: Emerald Ticket
Icon: 🟢
PixelTickets Value: 10
Price: \$20.00
Stripe Product: Created automatically
When user buys: +10 PixelTickets added to account
Ruby Ticket


Name: Ruby Ticket
Icon: 🔴
PixelTickets Value: 25
Price: \$50.00
Stripe Product: Created automatically
When user buys: +25 PixelTickets added to account
Sapphire Ticket


Name: Sapphire Ticket
Icon: 🔵
PixelTickets Value: 50
Price: \$100.00
Stripe Product: Created automatically
When user buys: +50 PixelTickets added to account
Silver Ticket


Name: Silver Ticket
Icon: ⚪
PixelTickets Value: 100
Price: \$200.00
Stripe Product: Created automatically
When user buys: +100 PixelTickets added to account
Gold Ticket


Name: Gold Ticket
Icon: 🟡
PixelTickets Value: 250
Price: \$500.00
Stripe Product: Created automatically
When user buys: +250 PixelTickets added to account
Diamond Ticket


Name: Diamond Ticket
Icon: 💎
PixelTickets Value: 500
Price: \$1,000.00
Stripe Product: Created automatically
When user buys: +500 PixelTickets added to account
Double Diamond Ticket


Name: Double Diamond Ticket
Icon: 💠
PixelTickets Value: 1,000
Price: \$2,000.00
Stripe Product: Created automatically
When user buys: +1,000 PixelTickets added to account
How Ticket Purchases Work
User Buys Diamond Ticket (500 PixelTickets)
Frontend: User clicks "Buy Tickets"
Frontend: Shows ticket shop with Diamond at $1,000
Frontend: User enters quantity (e.g., 1)
Frontend: User clicks "Buy"
Backend: Creates Stripe checkout session
Item: "1x Diamond Ticket"
Price: $1,000.00
Metadata: userId, ticketType, quantity, pixelTicketsTotal
Frontend: Redirects to Stripe checkout page
User: Enters payment details
User: Clicks "Pay"
Stripe: Processes payment
Stripe: Sends webhook to /api/webhook/stripe
json


{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_xxxxx",
      "payment_status": "paid",
      "metadata": {
        "userId": "5",
        "ticketType": "diamondTicket",
        "quantity": "1",
        "pixelTicketsTotal": "500"
      }
    }
  }
}
Backend: Receives webhook
Backend: Verifies Stripe signature (ensures it's real)
Backend: Extracts metadata:
User ID: 5
Ticket Type: diamondTicket
Quantity: 1
PixelTickets: 500
Backend: Updates database
User 5's diamondTickets: +1
User 5's total_pixeltickets: +500
Creates record in ticket_purchases table
Frontend: User sees "Payment successful!"
Frontend: User reloads page
Frontend: Inventory shows "+1 Diamond (500)"
User: Can now change pixels 500 times!
🔧 Webhook Data Structure
When a ticket purchase succeeds, Stripe sends this data:

json


{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123def456",
      "object": "checkout.session",
      "payment_status": "paid",
      "customer_email": "user@example.com",
      "metadata": {
        "userId": "42",
        "ticketType": "diamondTicket",
        "quantity": "2",
        "pixelTicketsTotal": "1000",
        "userEmail": "user@example.com"
      }
    }
  }
}
Your backend (stripe-webhook.js) reads this and:

Gets userId: 42
Gets ticketType: "diamondTicket"
Gets quantity: 2
Adds 2 Diamond tickets to user 42
Adds 1,000 PixelTickets to user 42
Creates audit record
🚨 Troubleshooting
"Webhook not received"
Problem: You clicked "Buy Tickets" but didn't get the webhook

Solutions:

Make sure Stripe CLI is still running: stripe listen --forward-to localhost:5000/api/webhook/stripe
Check that URL is exactly right (copy/paste the endpoint URL)
Check backend is running: npm start in backend folder
Look at backend console for error messages
Try manually triggering: stripe trigger checkout.session.completed
"Webhook signature verification failed"
Problem: Backend received webhook but rejected it

Solutions:

Your STRIPE_WEBHOOK_SECRET is wrong
Copy the secret from Stripe CLI output
Update .env file
Restart backend
Try again
"User not found"
Problem: Webhook tried to add tickets but user doesn't exist

Solution: This shouldn't happen. If it does:

Make sure user is logged in before buying
Check that userId in metadata is correct
Check database for user record
"Tickets not added to account"
Problem: Payment succeeded but tickets don't show

Solutions:

Refresh the page (hard refresh: Ctrl+Shift+R)
Check backend console for error messages
Check database directly:
bash


sqlite3 database/million-pixel.db
sqlite> SELECT * FROM user_tickets WHERE user_id=42;
Check ticket_purchases table:
bash


sqlite> SELECT * FROM ticket_purchases ORDER BY created_at DESC LIMIT 5;
🌐 Webhook URLs for Different Deployments
Local Testing


http://localhost:5000/api/webhook/stripe
Docker Compose (Local)


http://backend:5000/api/webhook/stripe
(Only works between Docker containers)

Heroku


https://your-app-name.herokuapp.com/api/webhook/stripe
AWS/DigitalOcean/VPS


https://your-domain.com/api/webhook/stripe
Custom Domain


https://yourdomain.com/api/webhook/stripe
✅ Checklist: Is Your Webhook Working?
 Stripe CLI installed
 Webhook forwarding running: stripe listen --forward-to localhost:5000/api/webhook/stripe
 .env STRIPE_WEBHOOK_SECRET matches CLI secret
 Backend running: npm start
 Frontend running: python -m http.server 3000
 Can trigger webhook: stripe trigger checkout.session.completed
 Backend console shows "Processing ticket purchase"
 User's ticket inventory updated
 Database has new ticket_purchases record
📖 Additional Resources
Stripe Webhooks Docs: https://stripe.com/docs/webhooks
Stripe CLI Docs: https://stripe.com/docs/stripe-cli
Webhook Events: https://stripe.com/docs/api/events
Testing: https://stripe.com/docs/testing
🎉 You're All Set!
Your webhook is now configured to:

✅ Receive payment confirmations from Stripe
✅ Verify they're really from Stripe
✅ Add tickets to user's account
✅ Track purchase history
✅ Handle all 9 ticket types
Good luck! 🚀



