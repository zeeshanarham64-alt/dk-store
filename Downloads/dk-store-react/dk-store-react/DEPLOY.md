# Putting DK Store on the internet

> These steps are written from how Render, Ubuntu, Caddy and pm2 normally work. They were **not** run against a real account, so check each host's current screens and prices.

Vercel uses the included serverless API with a Supabase Postgres database. Other hosts run the Node server and need persistent storage for the local SQLite database.

## Option A: Vercel + Supabase

1. In Vercel, open the DK Store project and set its **Root Directory** to the folder containing this `package.json` and `vercel.json` (`Downloads/dk-store-react/dk-store-react` in the current repository).
2. In Supabase, create a project on the Free plan. Open **Connect** and copy the **Transaction pooler** connection string.
3. In Vercel **Settings > Environment Variables**, add `SUPABASE_DB_URL` with that connection string to **Production**. Use the transaction pooler string (not the direct connection string) for Vercel serverless functions.
4. Add the following production variables:
   * `ADMIN_EMAIL`: the admin email you want to use.
   * `ADMIN_PASSWORD`: a new, strong password (at least 10 characters with letters and numbers). Do not reuse any password shared in chat.
   * `SESSION_SECRET`: a unique random value. Generate one locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and paste it directly into Vercel; do not share it in chat or commit it.
   * `COOKIE_SECURE`: `1`
   * `TRUST_PROXY`: `1`
   * `WHATSAPP`: your store contact number, country code first, without `+` or spaces.
   * `SITE_URL`: the production site origin (for example `https://dk-store-azm.vercel.app`), used for canonical links, the sitemap, reset links, and emails.
   * Optional email settings: `SMTP_USER`, `SMTP_PASS`, and `SHOP_EMAIL`.
5. Redeploy the project after the database and environment variables are ready. Vercel builds `dist/` and deploys the `/api/*` function; the API creates the database schema and initial product catalog on first use.
6. Open the production URL and test the store, `/admin.html`, an admin login, and an order. Then reload the dashboard to confirm the order is still there.

**Existing local data is not copied automatically.** The first Supabase database starts with the default products and a fresh admin account from the environment variables; existing SQLite users, orders, and stock need a separate import if you want to keep them. Supabase and Vercel free plans have limits and can change their terms.

## Share from your own computer (no hosting account needed)

## Share from your own computer (no hosting account needed)

**Why "localhost" only works for you:** `localhost` means "this computer". Nobody else's phone or laptop can open it. To let other people see the store you need one of the options below.

### 1. People on the same Wi-Fi (shop, home, office)
1. Start the store: `node dk-store.js`. The terminal prints a line like `Same Wi-Fi: other phones and computers can open http://192.168.1.23:3000`.
2. On another phone or computer **connected to the same Wi-Fi**, type that address into the browser.
3. If it does not open:
   * Windows may have asked "Allow access?". Allow it for **Private networks** (Start > "Allow an app through Windows Firewall" if you clicked No).
   * A guest Wi-Fi or a public hotspot often blocks devices from seeing each other. Use the main Wi-Fi.
   * Your computer must stay switched on and awake, and the address can change after a restart.

### 2. Anyone on the internet, for a while (a temporary public link)
A "tunnel" gives your local store a public https address. Two popular free tools are **Cloudflare Tunnel** (`cloudflared`) and **ngrok**. From their usual instructions (check their sites, this was not run against your account):
```
cloudflared tunnel --url http://localhost:3000      # prints https://something.trycloudflare.com
ngrok http 3000                                      # prints https://something.ngrok-free.app
```
1. Start the store, then start one of those in a second terminal. Copy the https address it prints.
2. Put these in your `.env` and restart the store:
   ```
   SITE_URL=https://the-address-it-printed
   COOKIE_SECURE=1
   TRUST_PROXY=1
   ```
3. Send the address to people. **Your computer must stay on**, the address changes every time you restart the tunnel, and anyone with the link can also see your admin login page. So: use a strong admin password, turn on **two-step login**, and stop the tunnel when you are finished. This is good for a demo or a weekend, not for a real business.

### 3. Permanently
Use a host so the store is online even when your computer is off: see Vercel + Supabase or Render below, and the section on your own `.com` / `.pk` address.

## Option B: Render (persistent SQLite disk)

**Important, checked against Render's own documentation:** your store keeps orders in a file. On Render, a service only keeps its files between restarts if it has a **persistent disk**, and disks can only be added to **paid** services. The free plan loses its files every time it restarts, and it also falls asleep after about 15 minutes without visitors. So **do not use the free plan for the real store**. The smallest paid plan is about $7 a month plus a small charge for the disk. Prices change, so check render.com/pricing.

### Step by step on Windows

1. **Make a GitHub account** at github.com (free). Click **New repository**, name it `dk-store`, choose **Private**, and click **Create repository**.
2. **Put the files in it.** On the new repository page click **uploading an existing file**. Drag in these three files from the extracted folder (they are also ready in the small `dk-store-render-upload` package): `dk-store.js`, `Dockerfile`, `render.yaml`. Click **Commit changes**. Do **not** upload a file named `.env`.
3. **Make a Render account** at render.com and choose **Sign in with GitHub** (allow it to see your `dk-store` repository).
4. In Render click **New +** then **Blueprint**, pick your `dk-store` repository, and continue. Render reads `render.yaml` and prepares the service with a 1 GB disk.
5. Render asks for two secret values:
   * `ADMIN_EMAIL`: the email you will log in with
   * `ADMIN_PASSWORD`: a strong password, **at least 10 characters with letters and numbers**. If it is weaker the store refuses to start and the Render log says why.
6. Press **Apply** and wait a few minutes. When the service says **Live**, Render shows an address like `https://dk-store.onrender.com`. **That is your live store.** Send that address to people.
7. Open `your-address/admin.html`, log in, and under **Security** turn on **two-step login**.
8. **Test it:** place an order from your phone. Then in Render click your service > **Manual Deploy** > **Deploy latest commit** (this restarts it) and check in the admin that the order is still there. That proves the disk works.
9. **Optional, later:** in Render > your service > **Environment** you can add `SMTP_USER`, `SMTP_PASS` and `SHOP_EMAIL` for order emails to Gmail (see the README), and `SITE_URL` once you have your own .com or .pk address. Save and Render restarts it.
10. **Your own .com or .pk address:** in Render open **Settings > Custom Domains** and follow the section further down.

**If something goes wrong:** open your service in Render and click **Logs**. The last lines say what the store printed, for example a weak password message. Send me a screenshot of those lines.

Render also takes a snapshot of the disk once a day, and you can download `store.db` from the service's Shell for your own backup.

## Option B: Your own server (Ubuntu VPS)

```bash
# 1. Install Node 22 (nodesource) and pm2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs && sudo npm i -g pm2

# 2. Copy dk-store.js to /opt/dk-store/ and create /opt/dk-store/.env
#    (PORT=3000, ADMIN_EMAIL, ADMIN_PASSWORD, WHATSAPP, COOKIE_SECURE=1, TRUST_PROXY=1, SMTP_*)
cd /opt/dk-store && pm2 start dk-store.js --name dk-store && pm2 save && pm2 startup

# 3. https with Caddy (gets a free certificate for your domain automatically)
sudo apt install -y caddy
echo 'yourdomain.com { reverse_proxy localhost:3000 }' | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
Point your domain's DNS **A record** at the server's IP first.

## Your own web address (.com or .pk)

A custom address makes the shop look professional and is easier to remember than `something.onrender.com`.

1. **Choose a registrar** (the company you buy the name from). `.com` is sold by almost every registrar. `.pk` is run by PKNIC and is sold through registrars in Pakistan and by some international ones. Prices differ a lot between registrars, so compare them, and look at the **renewal** price as well as the first-year price.
2. **Check what they need before you pay.** A `.com` is usually instant with a card. A `.pk` can take a few days to be approved, and the registrar may ask for ID or business documents. Sources disagree on the exact rules, so ask the registrar.
3. **Connect it to your host.** In your host's settings add the domain (on Render: your service > Settings > Custom Domains). The host shows you DNS records to create at the registrar, usually a `CNAME` for `www` and an `A` or `ALIAS` record for the bare domain.
4. **Wait for DNS** (minutes to a few hours). The host then issues the free https certificate by itself.
5. **Tell the store its address:** set `SITE_URL=https://yourdomain.pk` on the host and redeploy. Search engines and WhatsApp/Facebook share previews will then use your real address.
6. **Google:** create a free Google Search Console account, add your site, and submit `https://yourdomain.pk/sitemap.xml`. This helps people find you.
7. **Business email** (like `orders@yourdomain.pk`) is optional later. Gmail works fine for now.

## Before you announce the shop

* [ ] Read `/privacy`, `/terms` and `/delivery` and change anything that is not how you really work. They are plain templates, **not legal advice**.
* [ ] Add stock and check the prices.
* [ ] Place a test order from your phone, then cancel it in the admin.
* [ ] Turn on two-step login for the admin.
* [ ] Check your WhatsApp number is right (`WHATSAPP` in the settings).

## Security checklist for the admin panel

Already built in:
* Passwords are hashed (scrypt). The server refuses to start with a weak `ADMIN_PASSWORD`.
* Only the admin account can use `/api/admin/...`; customers get "Access denied".
* 5 wrong passwords lock that login for 15 minutes.
* Optional two-step login (authenticator app). **Turn it on.**
* Changing the password or "Log out on all devices" ends every other session.
* Security log of logins, failures, stock, price and status changes (admin page, bottom).
* Cookies are HttpOnly, SameSite, and with `COOKIE_SECURE=1` also https-only; HSTS is sent.

Your part:
1. Always use https and set `COOKIE_SECURE=1` and `TRUST_PROXY=1` behind a proxy.
2. Optional: set `ADMIN_IPS=your.home.ip` so the admin only works from your own network (skip it if your address changes).
3. Back up `data/store.db` regularly (download a copy from the disk or use the host's backups).
4. Never commit `.env` to GitHub (it is in `.gitignore`).
5. Keep Node updated.
