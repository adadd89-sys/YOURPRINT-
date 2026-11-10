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
5. Create the database schema: `npm run db:migrate`.
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
The repository currently includes the initial monorepo, Prisma schema, Telegram bot entry point, Telegram Web App authentication, customer order form/API and a protected admin order dashboard. The admin dashboard is available at `/admin` inside the Telegram Mini App. Admin access is restricted server-side to Telegram IDs listed in `ADMIN_TELEGRAM_IDS`. Administrators can filter orders, inspect order details, set deadlines and change statuses; status changes are recorded and a Telegram notification is sent to the customer. File uploads, promo-code workflows, repeat orders and deployment remain to be implemented and tested.
