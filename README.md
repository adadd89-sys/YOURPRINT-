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
3. Copy `.env.example` to `.env` and fill in the Telegram token, Mini App URL and PostgreSQL connection.
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
The repository contains the initial monorepo, database schema, Telegram bot entry point and monochrome Mini App landing screen. Order submission, Telegram Web App authentication, admin workflows and deployment are the next implementation steps.
