# DK Store: React front end + Node back end

Online store with customer accounts, admin dashboard, stock, revenue and PDF receipts.

* **Front end:** React 19 (store and admin pages) in `src/`
* **Back end:** `dk-store.js` (SQLite locally; Supabase Postgres for Vercel deployments)

## Easiest way to run it on Windows

1. **Install Node.js:** go to https://nodejs.org, download the **LTS** version, run the installer and keep clicking Next.
2. **Unzip the project:** right-click `dk-store-react.zip` > **Extract All** > Extract. (Do not double-click files while you are still looking inside the zip: it will not work.)
3. Open the extracted `dk-store-react` folder and double-click **start-windows.bat**.
   * If Windows says "Windows protected your PC", click **More info** and then **Run anyway**.
   * If it asks about the firewall ("Windows Defender Firewall has blocked some features"), tick **Private networks** and click **Allow access**.
4. A black window opens and the store appears in your browser at http://localhost:3000. The admin page is http://localhost:3000/admin.html.
5. **Write down the admin password** the window shows. It is shown only once. Keep the black window open while the store is running; closing it stops the store.

**Forgot that password?** Open the `dk-store-react` folder in File Explorer, click the address bar at the top, type `cmd` and press Enter. In the black window type:
`node dk-store.js --reset-password dkstore125@gmail.com NewPassword123`
(use your own new password: 10+ characters with letters and numbers).

**On a Mac:** double-click `start-mac.command` (the first time: right-click > Open).

Then follow the sections below if you want to change settings.

## Deploying to Vercel

The project includes a Vercel API function and Supabase database adapter. Follow [DEPLOY.md](./DEPLOY.md) for Supabase setup and secure Vercel environment variables. Local SQLite data is not imported automatically.

## 1. Just run it (no install, no build)

`dk-store.js` already contains the finished React website.

1. Open this folder in VS Code (**File > Open Folder**).
2. Create a file called `.env` next to `dk-store.js`:
   ```
   PORT=3000
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=choose-a-strong-password
   WHATSAPP=923141993887
   ```
   (Leave `ADMIN_PASSWORD` out and a random one is printed once in the terminal.)
3. Terminal: `node dk-store.js`
4. Store: http://localhost:3000   Admin: http://localhost:3000/admin.html
5. Open the store: **Add to cart works straight away.** To count stock, log in to the admin, tick **Track stock** on a product and add the number you have. A tracked product shows "Out of stock" when it reaches 0.

### Email every new order to dkstore125@gmail.com (optional)

1. In the Gmail account turn on **2-Step Verification** (Google Account > Security).
2. Still in Security, open **App passwords**, create one called "DK Store" and copy the 16 letters.
3. Add to `.env`:
   ```
   SMTP_USER=dkstore125@gmail.com
   SMTP_PASS=the16letterapppassword
   SHOP_EMAIL=dkstore125@gmail.com
   SITE_URL=https://your-website-address
   ```
4. Restart the server. Each new website order now sends an email with the customer, address, items and total.

Use the **app password**, never the normal Gmail password. If the email fails (wrong password, no internet) the order is still saved and the problem is printed in the terminal. Orders you enter yourself in the admin are not emailed.

## 2. Change the React code

You need Node 22.13+ (already needed above) and npm.

```
npm install
```

**While editing (hot reload):** open two terminals.

```
node dk-store.js        # terminal 1: the server and database on port 3000
npm run dev             # terminal 2: the React site on http://localhost:5173
```
Vite forwards `/api` calls to the server, so login and orders work in development.

**To use your changes for real:**

```
npm run build
node dk-store.js
```
`npm run build` creates a `dist/` folder. If `dist/` exists, `dk-store.js` serves it instead of the copy embedded inside the file. Delete `dist/` to go back to the embedded copy. (Note: the embedded copy inside `dk-store.js` does not update itself. Keep `dist/` next to the server when you deploy your edited version.)

## Where things are

| Path | What it is |
| --- | --- |
| `dk-store.js` | Server, database, login, orders, stock, PDF receipts, plus the embedded React build |
| `src/store/Store.jsx` | The whole store: header, hero, products, cart, checkout, login/sign up/account |
| `src/store/store.css` | Store styles (black and gold) |
| `src/admin/Admin.jsx` | Admin dashboard: login, revenue, chart, new order, stock, orders, customers |
| `src/admin/admin.css` | Dashboard styles |
| `src/lib.js` | `api()` helper and `money()` |
| `src/main.jsx`, `src/admin-main.jsx` | Entry points |
| `index.html`, `admin.html` | The two pages Vite builds |
| `public/img/` | Logo and product photos. Replace these files to change the pictures |
| `vite.config.mjs` | Dev server and build settings |
| `data/` | Created on first run: your database (`store.db`). Back it up. |

## How it works

* **Roles:** `admin` (you) and `user` (customers; guests can order too). Every `/api/admin/...` route refuses anyone who is not an admin, and the admin page shows "Access denied" to everyone else.
* **Prices and stock are decided by the server.** The browser only sends product ids and quantities.
* **The deal** (Rs 1,100) is a product made of one shampoo plus one glass cleaner and takes one of each from stock.
* **Cancelling an order** puts its stock back and removes it from revenue.
* Change a price in the dashboard and the store shows it immediately.

## What makes it feel professional

* Pages: store, Delivery and returns, Privacy, Terms, and a friendly 404 page. **Read the policy pages and adjust them to how you really work** (they are templates, not legal advice).
* Search and sharing: page title and description, canonical link, WhatsApp/Facebook share preview, business data for Google, `robots.txt`, `sitemap.xml`, app icon. Set `SITE_URL` so they use your real address.
* Phone friendly: menu button, WhatsApp chat button, "Skip to content" link, works with the keyboard.
* Stock honesty: "Only 3 left" badge, the cart cannot hold more than you have, and deal savings are worked out automatically.
* Fast: scripts and pages are compressed.
* Pakistan time is used for "today", "this month" and receipt times.
* Admin: rename products, hide or delete them (deleting is blocked when it would break your sales history), and the dashboard returns you to the login if your session ends.

## Tests

`npm test` starts the server on a temporary database and runs 59 checks (orders, stock, security, files, emails). It needs no install.

## Admin security

* Admin password must be 10+ characters with letters and numbers (the server will not start with a weaker `ADMIN_PASSWORD`).
* **Two-step login:** admin page > **Security** > "Set up two-step login". Works with Google Authenticator, Authy or Microsoft Authenticator. Turn this on.
* Wrong-password lockout, "Log out on all devices", and a **security log** at the bottom of the admin page.
* Optional: `ADMIN_IPS=your.ip` limits the admin to your own network. On a real website set `COOKIE_SECURE=1` (and `TRUST_PROXY=1` behind a host's proxy).
* **Forgot password** (login screen > "Forgot password?"): enter your email and you get a link to choose a new one. It works once and for 30 minutes. If you have set up order emails (see above) it arrives by email. If not, the link is **printed in the terminal window** where you started the server.
* **Logged in?** Admin page > **Account** changes your login email (needs your password, plus the 6-digit code if two-step login is on) and your name and phone. **Security** changes your password. Changing either logs out your other devices.
* **Locked out completely** (no email, lost phone)? In the terminal, in the project folder:
  ```
  node dk-store.js --reset-password you@email.com NewPassword123
  node dk-store.js --disable-2fa you@email.com
  ```
  Being able to run these proves you own the server, so no email is needed. Both log every device out and are written to the security log.

## Putting it online

**Want other people to see it?** `localhost` only works on your own computer. DEPLOY.md > "Share from your own computer" shows how to share it on your Wi-Fi or with a temporary public link. For a permanent website see DEPLOY.md (Render, or your own server) and the security checklist. `Dockerfile` and `render.yaml` are included.

## Not included yet

Online card or wallet payments (JazzCash, Easypaisa, Stripe), "forgot password" email, image upload, refunds.
