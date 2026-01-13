Onaan Pizza Bordeaux — static site + small Express backend

Quick start (on your host machine):

1. Install Node (>= 18) and npm.
2. From project root (where `package.json` is), install deps:

   npm install

3. Run the server:

   npm start

   The server listens on port 3000 by default. Open http://localhost:3000

What this provides:
- Serves the static site files (index.html, admin.html, assets)
- Provides a small SQLite-backed API at `/api/*` for categories and products

API endpoints:
- GET /api/categories — list categories
- GET /api/products — list all products
- GET /api/products?category=slug — products by category
- POST /api/products — create product (body: title, description, price, img, category_slug)
- PUT /api/products/:id — update product
- DELETE /api/products/:id — delete product

Notes:
- Images are served from the `assets/images` folder. When adding new product images via admin, upload them to `assets/images` on the server (or provide a public URL).
- For production deployment, configure a process manager (PM2, systemd) and ensure `data.db` (SQLite) is stored in a persistent location.
# Onaan Pizza Bordeaux - Landing Page

This is a simple static landing page built with HTML, Bootstrap and custom CSS.

How to use:

1. Open `index.html` in your browser.
2. Replace images in `assets/images/` with your own photos: `logo.png`, `hero.jpg`, `dish1.jpg`, `dish2.jpg`, `dish3.jpg`, `restaurant.jpg`.
3. Edit text content in `index.html` to match your restaurant information.

Files:
- `index.html` - main page
- `css/styles.css` - custom styles
- `assets/images/` - put your images here

If you want, I can also:
- convert this to a Flutter web page
- add a contact form handler (SMTP or using Formspree)
- deploy to GitHub Pages

