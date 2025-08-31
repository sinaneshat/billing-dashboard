<!-- Powered by BMAD™ Core -->

# User-Defined Preferred Patterns and Preferences

# ZarinPal Billing Dashboard Technical Preferences

## Architecture Constraints
- **Deployment**: Cloudflare Workers only (no other cloud providers)
- **Database**: D1 SQLite with Drizzle ORM (already configured)
- **Backend**: Hono.js API framework (existing pattern)
- **Frontend**: Next.js with App Router (existing setup)
- **Auth**: Better-auth with magic links (already implemented)
- **Styling**: Tailwind CSS + shadcn/ui components (existing)
- **State**: TanStack Query + React Hook Form (existing pattern)

## Iranian Market Specifics
- **Payment Gateway**: ZarinPal Direct Debit API only
- **Currency**: Iranian Rial (IRR) and Toman (TMN) support
- **Language**: Persian/Farsi UI support required
- **Compliance**: Iranian banking regulations (Shetab network)

## Scope Limitations (CRITICAL)
- NO admin panels or business dashboards
- NO analytics, reporting, or metrics systems
- NO complex pricing (usage-based, tiers, trials)
- NO multi-payment methods beyond ZarinPal
- NO proration calculations
- Keep everything minimal and functional

## Development Patterns
- TypeScript throughout
- Server actions for form submissions
- Edge-first API design for Cloudflare Workers
- Webhook-driven state updates
- Encrypted token storage for Direct Debit