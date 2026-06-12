# StreetCart

Simple Angular e-commerce storefront with Supabase products, orders, admin login, image upload, WhatsApp checkout, and UPI QR payment.

## Run Locally

```bash
npm install
npm start
```

Open `http://127.0.0.1:4200/`.

## Store Config

Edit these values in `src/app/app.ts`:

```ts
const WHATSAPP_NUMBER = '919999999999';
const UPI_ID = 'yourstore@upi';
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

- `WHATSAPP_NUMBER`: use country code without `+`, for example `919876543210`.
- `UPI_ID`: your real UPI ID, for example `store@upi`.
- `SUPABASE_URL`: from Supabase project settings.
- `SUPABASE_ANON_KEY`: from Supabase project API settings.

## Supabase Setup

1. Create a free Supabase project.
2. Open `SQL Editor`.
3. Paste and run `supabase/schema.sql`.
4. Go to `Authentication > Users`.
5. Create an admin user with email and password.
6. Paste your Supabase URL and anon key into `src/app/app.ts`.

The SQL creates:

- `products`: product catalog and stock.
- `orders`: customer orders.
- `product-images`: public storage bucket for product images.
- Row Level Security policies for public store access and authenticated admin access.

## Admin Login

Normal users do not see an Admin button on the website. To open admin:

1. Open the store homepage.
2. Click the `StreetCart` store name 5 times quickly.
3. The admin login page opens.
4. Login with the admin user you created in Supabase Auth.

## Product Image Uploads

Admin product images upload through Supabase Storage:

1. Open admin.
2. Go to `Products`.
3. Click `Upload image` for a product.
4. Choose a local image from your computer.
5. The app uploads it to the `product-images` bucket.
6. The image URL is saved in the product row.

## Build And Test

```bash
npm run build
npm test -- --watch=false
```

## Checkout Flow

1. App loads active in-stock products from Supabase.
2. Customer adds products to cart.
3. Customer fills name, phone, and address.
4. Customer chooses UPI or COD.
5. Order is saved to Supabase.
6. Product stock is reduced.
7. Customer confirms on WhatsApp if needed.
