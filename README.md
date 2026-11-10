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
The repository currently includes the initial monorepo, Prisma schema, Telegram bot entry point, Telegram Web App authentication, customer order form/API, a protected admin order dashboard and a customer account. The admin dashboard is available at `/admin` inside the Telegram Mini App. Admin access is restricted server-side to Telegram IDs listed in `ADMIN_TELEGRAM_IDS`. Administrators can filter orders, inspect order details, create orders manually for a customer by Telegram ID, set deadlines and prices, and change statuses; manually created orders are added to the customer account and a Telegram notification is attempted when the customer has already started the bot. Status changes are recorded and a Telegram notification is sent to the customer. The customer account lists the authenticated customer's orders, order details, deadlines, prices, attached artwork names and status history. Customers can repeat an order; a new order is created, the original item details and artwork Telegram file IDs are copied, and administrators are notified in Telegram. Customer order access is scoped server-side to the verified Telegram user. Customers can attach up to 5 artwork files per order (15 MB each; PNG, JPG, WEBP, PDF, SVG, TIFF, PSD and AI). Files are delivered to administrator chats through the Telegram Bot API and their Telegram file IDs and names are stored with the order. Administrators can create and deactivate promo codes with percentage discounts, optional start/end dates and usage limits. Customers can enter a code at checkout; validity and usage limits are checked on the server, usage is counted transactionally, and the applied discount is shown in the customer and admin order details. Final order pricing is still agreed manually in Telegram. Deployment and real-environment testing remain outstanding.
