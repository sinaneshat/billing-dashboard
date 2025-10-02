---
name: "Specialized Agents Context"
description: "Overview of specialized Claude Code agents for Roundtable's dashboard project"
---

# Specialized Agents Context

This directory contains specialized Claude Code agents optimized for Roundtable's AI collaboration dashboard project.

## Agent Responsibilities & Chaining

### Primary Agents

**backend-pattern-expert.md** - Hono + Cloudflare Workers + Drizzle ORM
- Database schema changes and Drizzle migrations
- API endpoint creation (route/handler/schema pattern)
- Authentication and session management
- Audit trail implementation
- API integration management

**frontend-ui-expert.md** - Next.js + shadcn/ui + TanStack Query
- Component creation following design system patterns
- TanStack Query hook implementation for data fetching
- Dashboard UI components and user flows
- Responsive design and accessibility

**i18n-translation-manager.md** - Internationalization specialist
- Translation key management (English + Persian)
- Hardcoded string detection and replacement
- RTL layout support for Persian/Farsi
- UI terminology consistency

**research-analyst.md** - Documentation and analysis
- API research and integration planning
- Technical documentation and best practices analysis
- Feature planning and requirements analysis

## Common Agent Workflows

### Feature Development Chain
1. **Research Agent**: Analyzes requirements, APIs, and patterns
2. **Backend Agent**: Implements database schema and API endpoints
3. **Frontend Agent**: Creates UI components and data fetching
4. **i18n Agent**: Ensures proper translation coverage

### Bug Fix Chain
1. **Backend Agent**: Analyzes API/database issues
2. **Frontend Agent**: Investigates UI/data fetching problems
3. **Quality validation**: Runs lint, type-check, i18n validation

## Project-Specific Context

All agents are enhanced with:
- AI collaboration platform patterns
- Multi-language support (English and Persian)
- Cloudflare Workers deployment patterns
- Drizzle ORM with D1 database optimization

## Usage Examples

```bash
# Explicit agent invocation
> Use the backend-pattern-expert agent to add a new API endpoint
> Have the frontend-ui-expert agent create a dashboard component
> Ask the i18n-translation-manager agent to audit the components

# Automatic delegation based on task type
> Add a new API handler  # → backend-pattern-expert
> Create a dashboard component  # → frontend-ui-expert
> Check if all forms have translations  # → i18n-translation-manager
```

Agents automatically coordinate through shared project context and established patterns in CLAUDE.md.
