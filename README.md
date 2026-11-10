# YOURPRINT

Telegram bot and Mini App for ordering DTF printing.

## Stack
- Telegram bot: grammY + TypeScript
- Customer Mini App and future admin area: Next.js + React
- Database: PostgreSQL + Prisma
- Monorepo: npm workspaces

## Requirements
- Node.js 20.6+
- npm
- PostgreSQL
- Telegram bot token from @BotFather

## Local setup
1. Clone this repository.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and fill in the Telegram token, Mini App URL, PostgreSQL connection and `ADMIN_TELEGRAM_IDS` (comma-separated numeric Telegram IDs of administrators).
4. Generate the Prisma client: `npm run db:generate`.
5. Apply the committed database migrations: `npm run db:deploy` (for local schema development, use `npm run db:migrate`).
6. Start the bot: `npm run dev:bot`.
7. Start the Mini App: `npm run dev:web`.

## Initial scope
- Black-and-white minimalist interface.
- Orders for ready artwork or a new design request.
- Customer and order records in a shared database.
- Telegram-only customer communication and order status notifications.
- Repeat orders, promo codes and discounts.
- Photo of completed order sent to the customer in Telegram.
- Admin tools for manual order creation, deadline tracking and adding administrators.
- Payment is agreed directly in Telegram.

## Product constraints
- DTF printing only in the first release.
- Clothing sizes: XS, S, M, L, XL, XXL, XXXL, Universal.
- No mass mailings or analytics in the first release.

## Current implementation status
The repository currently includes the initial monorepo, Prisma schema, Telegram bot entry point, Telegram Web App authentication, customer order form/API, a protected admin order dashboard and a customer account. The admin dashboard is available at `/admin` inside the Telegram Mini App. Admin access is restricted server-side to Telegram IDs listed in `ADMIN_TELEGRAM_IDS`. Administrators can filter orders, inspect order details, create orders manually for a customer by Telegram ID, upload a JPG/PNG completion photo (up to 10 MB) from the order card and send it to the customer through Telegram, set deadlines and prices, and change statuses; manually created orders are added to the customer account and a Telegram notification is attempted when the customer has already started the bot. Status changes are recorded and a Telegram notification is sent to the customer. The customer account lists the authenticated customer's orders, order details, deadlines, prices, attached artwork names and status history. Customers can repeat an order; a new order is created, the original item details and artwork Telegram file IDs are copied (completion photos are excluded), and administrators are notified in Telegram. Customer order access is scoped server-side to the verified Telegram user. Customers can attach up to 5 artwork files per order (15 MB each; PNG, JPG, WEBP, PDF, SVG, TIFF, PSD and AI). Files are delivered to administrator chats through the Telegram Bot API and their Telegram file IDs and names are stored with the order. Administrators can create and deactivate promo codes with percentage discounts, optional start/end dates and usage limits. Customers can enter a code at checkout; validity and usage limits are checked on the server, usage is counted transactionally, and the applied discount is shown in the customer and admin order details. Final order pricing is still agreed manually in Telegram. Deployment and real-environment testing remain outstanding.


## Continuous integration

GitHub Actions runs on pushes and pull requests targeting `main`. It installs the workspace dependencies, validates the Prisma schema, generates Prisma Client, applies all migrations to a temporary PostgreSQL 16 service, and builds both the Telegram bot and the Mini App. The workflow is defined in `.github/workflows/ci.yml`.

## Production launch checklist

1. Provision a production PostgreSQL database and keep its connection string private.
2. Configure the server environment using `.env.example`: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL`, and `ADMIN_TELEGRAM_IDS`.
3. Run `npm run db:deploy` against the production database before starting the application. The initial migration is intended for a fresh database; do not apply it to a database that already contains manually-created tables without first reconciling the schema.
4. Deploy the Mini App on a public HTTPS URL and set the same URL in `MINI_APP_URL).
5. Run the bot as a persistent Node.js process with the same `TELEGRAM_BOT_TOKEN`.
6. Open the bot, send `/start`, verify the Mini App button, and test customer registration, order creation, file delivery to admins, promo-code redemption, status notifications, repeat orders, and completion-photo delivery with real Telegram accounts.
7. Confirm the first administrator has opened the bot and started it, and each customer has started the bot before the bot attempts to message them.

Do not commit production secrets or paste the bot token into chat. This repository does not yet include hosting credentials or a production deployment target; a successful CI build is a prerequisite, not proof of a live production launch.
