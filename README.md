# StreetCart

Simple Angular e-commerce storefront with Google Sheets products/stock, WhatsApp checkout, UPI QR payment, and Google Sheets order logging.

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
const GOOGLE_SHEETS_SCRIPT_URL = '';
```

- `WHATSAPP_NUMBER`: use country code without `+`, for example `919876543210`.
- `UPI_ID`: your real UPI ID, for example `store@upi`.
- `GOOGLE_SHEETS_SCRIPT_URL`: paste the Apps Script web app URL after deploying the script below. The app will use this URL to read products and save orders.

## Google Sheets Setup

1. Create a new Google Sheet.
2. Rename the first sheet to `Orders`, or let the script create it automatically.
3. In the sheet, go to `Extensions > Apps Script`.
4. Delete the default code.
5. Paste the full contents of `google-sheets/Code.gs`.
6. Click `Save`.
7. Click `Deploy > New deployment`.
8. Choose type `Web app`.
9. Set `Execute as` to `Me`.
10. Set `Who has access` to `Anyone`.
11. Click `Deploy` and approve permissions.
12. Copy the generated Web app URL.
13. Paste it into `GOOGLE_SHEETS_SCRIPT_URL` in `src/app/app.ts`.

After this, opening the web app URL once will create these tabs in your Google Sheet:

- `Dashboard`: quick admin summary.
- `Products`: editable product catalog and stock.
- `Orders`: saved customer orders.
- `Admins`: editable admin login details.

## Admin Login

Normal users do not see an Admin button on the website. To open admin:

1. Open the store homepage.
2. Click the `StreetCart` store name 5 times quickly.
3. The admin login page opens.

After deployment, the script creates an `Admins` tab with this default login:

```text
admin@example.com | admin123 | Store Admin | TRUE
```

Change the email/password directly in the `Admins` tab. Keep `Active` as `TRUE` for allowed admins, or change it to `FALSE` to block that login.

Important: after changing `google-sheets/Code.gs`, deploy a new Apps Script web app version. Google keeps running the old deployed version until you redeploy.

## Products Sheet

The script creates a `Products` tab with these columns:

```text
ID | Name | Category | Price | Image | Sizes | Stock | Active
```

Example row:

```text
1 | Sprint Runner Sneakers | Shoes | 2499 | https://... | 7,8,9,10 | 12 | TRUE
```

How to edit products:

- Change `Name`, `Price`, `Image`, `Sizes`, or `Stock` directly in Google Sheets.
- Use categories from the app: `Shoes`, `Shirts`, `Pants`, `Accessories`.
- Put comma-separated sizes in `Sizes`, for example `S,M,L,XL`.
- Set `Active` to `TRUE` to show a product.
- Set `Active` to `FALSE` or `Stock` to `0` to hide a product from the website.

When a customer saves an order, the script also reduces the product stock in the `Products` tab.

If `GOOGLE_SHEETS_SCRIPT_URL` is empty or the script cannot be reached, the app shows demo products from `src/app/app.ts`.

## Build And Test

```bash
npm run build
npm test -- --watch=false
```

## Checkout Flow

1. App loads active in-stock products from the `Products` sheet.
2. Customer adds products to cart.
3. Customer fills name, phone, and address.
4. Customer scans the UPI QR or taps the UPI payment link.
5. Store owner clicks/saves order to Google Sheets.
6. Order is added to the `Orders` sheet and stock is reduced in `Products`.
7. Customer confirms the order on WhatsApp with the generated order message.
