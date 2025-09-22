---
name: "Specialized Agents Context"
description: "Overview of specialized Claude Code agents for Roundtable's billing dashboard project"
---

# Specialized Agents Context

This directory contains specialized Claude Code agents optimized for Roundtable's billing dashboard project.

## Agent Responsibilities & Chaining

### Primary Agents

**backend-pattern-expert.md** - Hono + Cloudflare Workers + Drizzle ORM
- Database schema changes and Drizzle migrations
- API endpoint creation (route/handler/schema pattern)
- ZarinPal integration and webhook processing
- Billing event audit trail implementation
- Direct debit contract management

**frontend-ui-expert.md** - Next.js + shadcn/ui + TanStack Query
- Component creation following design system patterns
- TanStack Query hook implementation for data fetching
- Billing dashboard UI components and payment flows
- Iranian Rial currency formatting and RTL support

**i18n-translation-manager.md** - Internationalization specialist
- Translation key management (English + Persian)
- Hardcoded string detection and replacement
- RTL layout support for Persian/Farsi
- Billing domain terminology consistency

**research-analyst.md** - Documentation and analysis
- ZarinPal API research and integration planning
- Iranian payment regulations and compliance research
- Technical documentation and best practices analysis

## Common Agent Workflows

### Feature Development Chain
1. **Research Agent**: Analyzes requirements, APIs, regulations
2. **Backend Agent**: Implements database schema and API endpoints
3. **Frontend Agent**: Creates UI components and data fetching
4. **i18n Agent**: Ensures proper translation coverage

### Payment Integration Chain
1. **Research Agent**: Studies ZarinPal API and compliance requirements
2. **Backend Agent**: Implements payment processing and webhook handling
3. **Database audit**: Creates billing events for transaction tracking
4. **Frontend Agent**: Builds payment UI and status indicators
5. **i18n Agent**: Localizes payment flow text and error messages

### Bug Fix Chain
1. **Backend Agent**: Analyzes API/database issues
2. **Frontend Agent**: Investigates UI/data fetching problems
3. **Quality validation**: Runs lint, type-check, i18n validation

## Project-Specific Context

All agents are enhanced with:
- Billing domain patterns (subscriptions, payments, direct debit)
- ZarinPal Payman integration specifics
- Iranian business requirements (IRR currency, Persian locale)
- Cloudflare Workers deployment patterns
- Drizzle ORM with D1 database optimization

## Usage Examples

```bash
# Explicit agent invocation
> Use the backend-pattern-expert agent to add a new subscription endpoint
> Have the frontend-ui-expert agent create a payment status card component
> Ask the i18n-translation-manager agent to audit the billing components

# Automatic delegation based on task type
> Add a new ZarinPal webhook handler  # → backend-pattern-expert
> Create a subscription dashboard component  # → frontend-ui-expert
> Check if all payment forms have translations  # → i18n-translation-manager
```

Agents automatically coordinate through shared project context and established patterns in CLAUDE.md.