# Luxury Tattoo Studio

A full-stack starter for a premium tattoo studio website with USD pricing, standard and custom bookings, Paystack, NOWPayments, MongoDB, Cloudinary uploads, email notifications, and a protected admin dashboard.

## Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- Database: MongoDB + Mongoose
- Payments: Paystack (USD) and NOWPayments (crypto invoices)
- Image storage: Cloudinary (optional until configured)
- Email: SMTP via Nodemailer (optional)

## Requirements
- Node.js 20+
- MongoDB Atlas or local MongoDB
- Paystack account and secret key
- NOWPayments account, API key and IPN secret
- Cloudinary account for image uploads (optional)
- SMTP credentials for email notifications (optional)

## Run locally
1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `FRONTEND_URL`.
3. Add Paystack/NOWPayments keys when ready. Use TEST keys first.
4. In a terminal:
   ```bash
   cd backend
   npm install
   npm run seed:admin
   npm run seed:packages
   npm run dev
   ```
5. Open http://localhost:5000

The Express server serves the frontend from `../frontend`, so one local server is enough.

## First admin login
The admin is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` by `npm run seed:admin`. Change the password after the first login. Do not deploy with the example credentials.

## Payment configuration
### Paystack
- Set `PAYSTACK_SECRET_KEY` in the backend `.env`.
- The backend initializes transactions in USD cents and verifies transactions server-side.
- Configure Paystack webhook URL to: `https://YOUR-DOMAIN/api/webhooks/paystack`
- For the current Paystack signing-secret webhook format, set `PAYSTACK_WEBHOOK_SECRET` (`whsec_...`). The code also supports the legacy `x-paystack-signature` HMAC format when no signing secret is configured.
- USD is supported for Kenya according to Paystack's supported-currency documentation, but your merchant account must have USD enabled and your settlement arrangement must support it. Confirm in your Paystack dashboard before going live.

### NOWPayments
- Set `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, and `NOWPAYMENTS_BASE_URL=https://api.nowpayments.io/v1`.
- The backend creates an invoice with `price_currency: "usd"` and the requested `pay_currency`.
- Set the NOWPayments IPN callback URL to `https://YOUR-DOMAIN/api/webhooks/nowpayments` (also passed when creating invoices).
- In NOWPayments dashboard, generate the IPN secret and ensure it matches `.env`.
- The webhook verifies `x-nowpayments-sig` using HMAC-SHA512 over the recursively key-sorted JSON body.
- Crypto choices are validated against a configurable allow-list. Check your NOWPayments account's supported currencies and networks before enabling them.

## Cloudinary uploads
Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Admin portfolio image/video upload is available in the dashboard (up to 30 MB per file). Without Cloudinary configured, upload routes return a clear configuration error.

## Email notifications
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. If SMTP is not configured, the app still works; emails are skipped and logged.

## Deployment on Render
- Create a Web Service using the repository root.
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`
- Add all backend `.env` variables in Render Environment.
- Set `NODE_ENV=production`, `FRONTEND_URL=https://your-domain.com`.
- Add a persistent MongoDB Atlas URI.
- Add your production webhook URLs to Paystack and NOWPayments dashboards.
- Use HTTPS and test with test keys before switching to live keys.

## Important production checklist
- Change admin password and use a long random `JWT_SECRET`.
- Never expose secret keys in frontend code.
- Configure exact webhook secrets and test webhook delivery.
- Restrict CORS to your domain (`FRONTEND_URL`).
- Add backups and monitor failed payments.
- Review local tax, consumer, privacy, refund and appointment policies with a qualified professional.
- Payment success is determined only by server verification/webhooks, never by a browser redirect.
- A payment gateway may have market, account, currency, network, minimum-amount and compliance restrictions. Confirm those in the provider dashboard.

## API overview
Public:
- `GET /api/packages`
- `POST /api/bookings/standard`
- `POST /api/bookings/custom`
- `GET /api/bookings/track/:reference`
- `POST /api/payments/paystack/initialize`
- `POST /api/payments/nowpayments/invoice`
- `GET /api/payments/paystack/verify/:reference`
- `GET /api/health`

Admin (Bearer JWT):
- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/:id`
- `POST /api/admin/bookings/:id/quote`
- `GET /api/admin/payments`
- `GET/POST/PATCH/DELETE /api/admin/packages`
- `GET/POST/DELETE /api/admin/portfolio`
- `GET/PATCH /api/admin/settings`

Webhooks:
- `POST /api/webhooks/paystack`
- `POST /api/webhooks/nowpayments`

## References
- Paystack transaction API: https://paystack.com/docs/api/transaction/
- Paystack webhooks: https://paystack.com/docs/payments/webhooks/
- Paystack supported currencies: https://paystack.com/docs/v2/api/supported-currencies
- NOWPayments API: https://nowpayments.io/api
- NOWPayments IPN setup: https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
