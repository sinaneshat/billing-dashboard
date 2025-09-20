# CLAUDE.md

Project guidance for Claude Code specialized agents working on Roundtable's billing dashboard - a white-labelable ZarinPal payment platform for Iranian businesses.

## Essential Commands

```bash
# Development
pnpm dev                    # Start development with turbo
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm lint:fix               # Fix ESLint issues
pnpm check-types            # TypeScript type checking
pnpm lint:modified          # Lint only modified files

# Database Management
pnpm db:generate            # Generate Drizzle migrations
pnpm db:migrate:local       # Apply migrations locally
pnpm db:migrate:preview     # Apply migrations to preview
pnpm db:migrate:prod        # Apply migrations to production
pnpm db:studio:local        # Open Drizzle Studio
pnpm db:fresh:quick         # Reset and seed database quickly
pnpm db:full-reset:local    # Complete database reset

# Cloudflare Deployment
pnpm cf-typegen            # Generate CloudflareEnv types
pnpm preview               # Build and preview worker locally
pnpm deploy:preview        # Deploy to preview environment
pnpm deploy:production     # Deploy to production

# Testing & Quality
pnpm i18n:full-check       # Check all i18n translations
pnpm i18n:validate         # Validate translation structure
pnpm i18n:check-unused     # Find unused translation keys
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/dashboard/   # Protected billing dashboard
│   ├── auth/              # Authentication pages
│   ├── api/               # Next.js API routes (proxy)
│   └── payment/           # Payment callback pages
├── api/                   # Hono API implementation
│   ├── routes/            # Domain-specific routes
│   │   ├── auth/          # Better Auth integration
│   │   ├── subscriptions/ # Subscription lifecycle
│   │   ├── payment-methods/ # Direct debit contracts
│   │   ├── payments/      # Payment processing
│   │   └── webhooks/      # ZarinPal webhooks
│   ├── services/          # Business logic
│   │   ├── zarinpal.ts    # Core payment processing
│   │   └── zarinpal-direct-debit.ts # Payman API
│   └── middleware/        # Auth, CORS, rate limiting
├── components/            # React components
│   ├── ui/                # shadcn/ui base components
│   ├── billing/           # Billing-specific UI
│   └── auth/              # Authentication UI
├── db/                    # Database layer
│   ├── tables/            # Drizzle schema definitions
│   │   ├── auth.ts        # Users, sessions, accounts
│   │   ├── billing.ts     # Products, subscriptions, payments
│   │   └── external-integrations.ts # Webhooks, logs
│   └── migrations/        # SQL migration files
├── hooks/                 # React Query data fetching
├── lib/                   # Utility libraries
└── i18n/                  # Internationalization
    └── locales/           # en.json, fa.json translations
```

## Core Architecture Patterns

### Database Layer (Drizzle + Cloudflare D1)
**Critical Tables** (`src/db/tables/`):
- **billing.ts**: `product`, `subscription`, `payment`, `paymentMethod`, `billingEvent`, `webhookEvent`
- **auth.ts**: `user`, `session`, `account`, `verification`

**Essential Patterns**:
- All billing operations create `billingEvent` audit entries
- Payment methods store ZarinPal Payman direct debit contracts only
- Use `createSelectSchema`/`createInsertSchema` from drizzle-zod for type safety
- Multi-table operations require `db.transaction()` for consistency
- Indexes optimized for billing queries and reporting

**Key Relationships**:
- Users → Subscriptions (one-to-many)
- Subscriptions → Payments (one-to-many)
- Users → Payment Methods (one-to-many)
- All entities → Billing Events (audit trail)

### API Layer (Hono + OpenAPI + Zod)
**Structure Pattern**: `src/api/routes/{domain}/`
- **route.ts**: OpenAPI route definitions with Zod schemas
- **handler.ts**: Business logic implementation
- **schema.ts**: Request/response validation schemas

**Required Implementation**:
- Every endpoint needs Zod request/response schemas
- Use `createApiResponseSchema()` for consistent API responses
- Session middleware via `getSessionUser()` for authentication
- Comprehensive error handling through middleware chain
- OpenAPI documentation auto-generated at `/api/v1/scalar`

### Frontend Layer (Next.js 15 + shadcn/ui + TanStack Query)
**Component Structure**: `src/components/{domain}/{component}.tsx`
- Reuse existing shadcn/ui components from `src/components/ui/`
- TanStack Query hooks in `src/hooks/` for server state
- All user text through `useTranslations()` - NO hardcoded strings
- RTL support for Persian/Farsi locale

## ZarinPal Integration Context

**Direct Debit (Payman)** contracts enable automated recurring billing:
- Contract signatures stored in `paymentMethod.contractSignature`
- Status flow: `pending_signature` → `active` → `cancelled_by_user` → `expired`
- Key services: `zarinpal.ts`, `zarinpal-direct-debit.ts`
- Webhook processing for real-time payment status updates

## Environment Configuration

**Critical Variables**:
```bash
DATABASE_URL=file:./local.db               # Local D1 database
BETTER_AUTH_SECRET=your-secret-key         # Session encryption
ZARINPAL_MERCHANT_ID=your-merchant-id      # Payment gateway
NEXT_PUBLIC_WEBAPP_ENV=local|preview|prod  # Environment detection
```

**Cloudflare Bindings** (wrangler.jsonc):
- **DB**: D1 database with separate local/preview/prod instances
- **KV**: Key-value storage for caching
- **UPLOADS_R2_BUCKET**: File upload storage
- **NEXT_INC_CACHE_R2_BUCKET**: Next.js incremental cache

## Document Context References

**Context Prime Pattern**: Agents must consult these specific directories and files as primary context before implementing any changes. Always reference documents using the pattern `directory/file:line_number` when citing specific code examples or patterns.

### Backend Development Context (`backend-pattern-expert`)
**Primary Context Documents**:
- **Route Patterns**: `/src/api/routes/{domain}/` - Study existing route implementations
  - `/src/api/routes/auth/` - Authentication and session handling patterns
  - `/src/api/routes/subscriptions/` - Subscription lifecycle management
  - `/src/api/routes/payment-methods/` - Direct debit contract patterns
  - `/src/api/routes/payments/` - Payment processing workflows
  - `/src/api/routes/webhooks/` - ZarinPal webhook handling

- **Database Schema**: `/src/db/tables/` - All database entity definitions
  - `/src/db/tables/billing.ts` - Core billing entities and relationships
  - `/src/db/tables/auth.ts` - User authentication and session tables
  - `/src/db/tables/external-integrations.ts` - Webhook and audit logging

- **Service Layer**: `/src/api/services/` - Business logic implementations
  - `/src/api/services/zarinpal.ts` - Core payment processing service
  - `/src/api/services/zarinpal-direct-debit.ts` - Payman API integration

- **Middleware Patterns**: `/src/api/middleware/` - Authentication, CORS, rate limiting
- **Migration Examples**: `/src/db/migrations/` - Database change patterns

### Frontend Development Context (`frontend-ui-expert`)
**Primary Context Documents**:
- **Component Patterns**: `/src/components/` - Established UI component architecture
  - `/src/components/ui/` - shadcn/ui base components (Button, Card, Dialog, etc.)
  - `/src/components/billing/` - Domain-specific billing UI components
  - `/src/components/auth/` - Authentication flow components

- **Page Layouts**: `/src/app/` - Next.js App Router structure
  - `/src/app/(app)/dashboard/` - Protected dashboard pages and layouts
  - `/src/app/auth/` - Authentication pages (login, register, callback)
  - `/src/app/payment/` - Payment flow pages and status handling

- **Data Fetching**: `/src/hooks/` - TanStack Query patterns for server state
- **Utility Functions**: `/src/lib/` - Shared utilities, validation, formatting
- **Styling Patterns**: `/src/components/ui/` - Design system implementation

### Internationalization Context (`i18n-translation-manager`)
**Primary Context Documents**:
- **Translation Files**: `/src/i18n/locales/` - Translation key management
  - `/src/i18n/locales/en.json` - English translations (source of truth)
  - `/src/i18n/locales/fa.json` - Persian/Farsi translations (RTL)
- **Component Usage**: `/src/components/` - Scan for hardcoded strings and translation usage
- **Translation Patterns**: Look for `useTranslations()` hooks and `t()` function usage

### Configuration Context (All Agents)
**Primary Context Documents**:
- **Environment Setup**: `/wrangler.jsonc` - Cloudflare Workers configuration and bindings
- **Package Dependencies**: `/package.json` - Available libraries and scripts
- **TypeScript Config**: `/tsconfig.json` - Compiler options and path mappings
- **Database Config**: `/drizzle.config.ts` - Drizzle ORM configuration
- **Agent Specifications**: `.claude/agents/{agent-name}.md` - Agent-specific patterns and workflows

### Research Context (`research-analyst`)
**Primary Context Documents**:
- **API Documentation**: Look for existing API integrations in `/src/api/services/`
- **Environment Variables**: Check `/.env.example` and `/wrangler.jsonc` for configuration patterns
- **Business Logic**: Analyze `/src/db/tables/billing.ts` for domain understanding
- **Integration Patterns**: Review `/src/api/routes/webhooks/` for third-party integration examples

## Context Prime Workflow Patterns

**Mandatory Pre-Implementation Steps** - All agents must follow this sequence:

### 1. Document Discovery Phase
```bash
# Agent reads relevant context documents BEFORE any implementation
1. Read primary context documents for the specific domain
2. Examine 2-3 similar existing implementations
3. Identify established patterns and conventions
4. Note any domain-specific requirements or constraints
```

### 2. Pattern Analysis Phase
```bash
# Agent analyzes existing code to understand patterns
1. Study file structure and naming conventions
2. Examine middleware chains and error handling patterns
3. Identify type safety and validation approaches
4. Review integration points and data flows
```

### 3. Implementation Alignment Phase
```bash
# Agent ensures new code follows discovered patterns
1. Extend existing patterns rather than creating new ones
2. Maintain consistency with established conventions
3. Preserve type safety chains and validation flows
4. Follow the same error handling and response patterns
```

### 4. Reference Documentation Pattern
When implementing or referencing code:
- **File References**: Use `src/api/routes/auth/route.ts:45` format for specific lines
- **Pattern References**: Cite `"following the pattern established in src/api/routes/subscriptions/"`
- **Schema References**: Reference `"extending the schema pattern from src/db/tables/billing.ts:112"`
- **Example References**: Point to `"similar implementation in src/components/billing/PaymentMethodCard.tsx"`

### 5. Quality Verification Pattern
```bash
# Agent validates implementation against context
1. Verify consistency with referenced patterns
2. Ensure all dependencies and imports follow project conventions
3. Confirm middleware chains and error handling are complete
4. Validate that OpenAPI schemas and type inference work end-to-end
```

### Context Prime Example Workflow

**Backend Agent Task**: "Add new subscription renewal endpoint"

```bash
1. READ CONTEXT: /src/api/routes/subscriptions/ existing endpoints
2. ANALYZE PATTERN: route.ts + handler.ts + schema.ts structure
3. EXAMINE SCHEMA: /src/db/tables/billing.ts subscription table
4. STUDY SERVICES: /src/api/services/zarinpal.ts payment processing
5. IMPLEMENT: Following established patterns in subscriptions domain
6. REFERENCE: "This endpoint follows the pattern from src/api/routes/subscriptions/create.ts:23"
```

**Frontend Agent Task**: "Create subscription status card component"

```bash
1. READ CONTEXT: /src/components/billing/ existing billing components
2. ANALYZE PATTERN: /src/components/ui/ shadcn component structure
3. EXAMINE HOOKS: /src/hooks/ data fetching patterns for subscriptions
4. STUDY LAYOUTS: /src/app/(app)/dashboard/ page layout patterns
5. IMPLEMENT: Reusing ui components and following billing domain patterns
6. REFERENCE: "Component structure follows src/components/billing/PaymentMethodCard.tsx:15"
```

## Specialized Agent Context

Located in `.claude/agents/` - See **`.claude/agents/README.md`** for complete workflows.

Each agent has domain-specific expertise:

**backend-pattern-expert.md**: Hono + Cloudflare Workers + Drizzle ORM specialist
- **Must consult**: `/src/api/routes/{domain}/` patterns, `/src/db/tables/billing.ts` schema, `/src/api/services/zarinpal.ts`
- Database schema changes and migrations (`/src/db/migrations/` examples)
- API endpoint creation following established patterns (`/src/api/routes/` structure)
- ZarinPal integration and webhook handling (`/src/api/routes/webhooks/`, `/src/api/services/`)

**frontend-ui-expert.md**: Next.js + shadcn/ui + TanStack Query specialist
- **Must consult**: `/src/components/ui/` patterns, `/src/app/(app)/dashboard/` layouts, `/src/hooks/` data fetching
- Component creation following design system (`/src/components/ui/` base components)
- Data fetching with React Query patterns (`/src/hooks/` existing implementations)
- Responsive UI with accessibility standards (`/src/components/billing/` examples)

**i18n-translation-manager.md**: Internationalization specialist
- **Must consult**: `/src/i18n/locales/en.json` source keys, `/src/components/` translation usage patterns
- Translation key management and validation (`/src/i18n/locales/` files)
- Hardcoded string detection and replacement (`/src/components/` scan for `useTranslations()`)
- Persian/Farsi RTL layout support (`/src/i18n/locales/fa.json` patterns)

**research-analyst.md**: Documentation and analysis specialist
- **Must consult**: `/src/api/services/` for integration patterns, `/wrangler.jsonc` for configuration
- Project documentation and planning (`.claude/agents/` specifications)
- Third-party API research and integration analysis (`/src/api/services/zarinpal.ts` examples)
- Best practices research and recommendations (`/src/db/tables/` domain modeling)

## Agent Chaining Examples

**Database → Backend → Frontend**:
1. Schema changes trigger migration generation
2. Backend agent updates API endpoints with new schemas
3. Frontend agent updates React Query hooks and UI components

**Feature Development Workflow**:
1. Research agent analyzes requirements and APIs
2. Backend agent implements database schema and API endpoints
3. Frontend agent creates UI components and data fetching
4. i18n agent ensures all text is properly translated

**Payment Integration Pattern**:
1. Backend agent implements ZarinPal API integration
2. Database operations for payment tracking and audit trails
3. Frontend agent creates payment UI and status handling
4. Webhook processing for real-time updates

## Advanced Agent Orchestration Patterns

### Parallel Agent Execution

**Multi-Agent Concurrency**: Execute multiple specialized agents simultaneously for independent but related tasks.

```bash
# Example: Feature development with parallel agents
> Use the research-analyst agent to research ZarinPal Payman API patterns while the backend-pattern-expert agent analyzes our current payment flow, and have the i18n-translation-manager agent audit the existing payment forms for translation coverage

# Claude Code will execute all three agents in parallel:
# 1. research-analyst: ZarinPal API documentation research
# 2. backend-pattern-expert: Current payment flow analysis
# 3. i18n-translation-manager: Translation audit of payment forms
```

**Parallel Task Decomposition**:
- **Independent Context**: Each agent operates in isolated context windows
- **Concurrent Execution**: Multiple agents run simultaneously to reduce total completion time
- **Aggregated Results**: Main thread consolidates findings from all parallel agents
- **Tool Resource Management**: Agents share file system access but maintain separate execution contexts

### Sequential Agent Chaining with Context Handoff

**Information Flow Patterns**: Structure agent chains to pass refined context between specialized agents.

```bash
# Pattern 1: Discovery → Implementation → Validation
1. research-analyst: "Analyze current subscription billing patterns and identify gaps"
   → Output: Findings document with specific implementation recommendations

2. backend-pattern-expert: "Implement subscription renewal automation using research findings"
   → Input: Research agent's findings and recommendations
   → Output: API endpoints, database schema changes, service implementations

3. frontend-ui-expert: "Create UI components for the new subscription management features"
   → Input: Backend agent's API specifications and data models
   → Output: React components, TanStack Query hooks, user flows

4. i18n-translation-manager: "Ensure all new UI text is properly internationalized"
   → Input: Frontend agent's components and user-facing text
   → Output: Translation keys, updated locale files, compliance report
```

**Context Handoff Strategies**:
- **Artifact Preservation**: Key findings, schemas, and implementations are preserved between agent transitions
- **Reference Linking**: Agents reference specific files and line numbers from previous agents' work
- **Incremental Refinement**: Each agent builds upon and refines the previous agent's output
- **Validation Loops**: Later agents can identify issues that require re-execution of earlier agents

### Multiple Agent Instances and Specialization

**Domain-Specific Agent Instances**: Deploy multiple instances of the same agent type for different domains or contexts.

```bash
# Example: Multiple backend agents for different domains
> Use one backend-pattern-expert agent to implement subscription billing endpoints while another backend-pattern-expert agent implements payment method management endpoints

# Agent Instance Differentiation:
# Instance 1: backend-pattern-expert (subscriptions domain)
#   - Context: src/api/routes/subscriptions/, src/db/tables/billing.ts
#   - Focus: Subscription lifecycle, billing events, renewal automation
#
# Instance 2: backend-pattern-expert (payment-methods domain)
#   - Context: src/api/routes/payment-methods/, src/api/services/zarinpal-direct-debit.ts
#   - Focus: Payman contracts, direct debit management, payment method CRUD
```

**Specialized Agent Configurations**:
- **Scoped Tool Access**: Different instances can have different tool permissions
- **Model Selection**: Critical agents can use higher-capability models (`opus`), while routine tasks use efficient models (`haiku`)
- **Context Boundaries**: Each instance maintains focused context relevant to its specific domain
- **Resource Optimization**: Multiple lightweight agents can be more efficient than one complex agent

### Dynamic Agent Delegation and Selection

**Intelligent Agent Routing**: Claude Code automatically selects and chains agents based on task complexity and requirements.

```bash
# Trigger Patterns for Automatic Agent Selection:

# Code Quality Tasks → Automatic code-reviewer delegation
"Review my recent payment processing changes"
→ Automatically invokes code-reviewer agent proactively

# Data Analysis Tasks → Automatic research-analyst delegation
"What's the best approach for handling failed ZarinPal payments?"
→ Automatically invokes research-analyst for API research and best practices

# UI Implementation → Automatic frontend-ui-expert delegation
"Add a subscription status dashboard"
→ Automatically invokes frontend-ui-expert for component implementation

# Complex Multi-Domain → Automatic agent chaining
"Implement recurring billing with ZarinPal Payman"
→ Automatically chains: research-analyst → backend-pattern-expert → frontend-ui-expert → i18n-translation-manager
```

**Selection Criteria**:
- **Task Complexity**: Multi-step tasks trigger agent chaining automatically
- **Domain Keywords**: Specific terminology triggers appropriate specialized agents
- **Context Analysis**: Current conversation context influences agent selection
- **Failure Recovery**: If an agent encounters domain-specific issues, Claude Code can automatically delegate to a more specialized agent

### Context Sharing and Information Architecture

**Cross-Agent Information Flow**: Structured patterns for sharing context and findings between agents.

```bash
# Information Sharing Patterns:

# 1. Artifact-Based Sharing
Agent A creates → implementation files, documentation, schemas
Agent B consumes → reads Agent A's outputs, builds upon them
Agent C validates → reviews Agent A & B outputs, provides feedback

# 2. Reference-Based Sharing
Agent A provides → "Following patterns from src/api/routes/subscriptions/create.ts:23"
Agent B extends → "Building on Agent A's subscription pattern, implementing payment flow"
Agent C integrates → "Connecting Agent A's subscriptions with Agent B's payments in UI"

# 3. Context Cascade Sharing
Agent A establishes → Core domain understanding and constraints
Agent B inherits → Domain knowledge + adds implementation details
Agent C inherits → Domain + implementation + adds user experience layer
```

**Structured Context Documents**:
- **Findings Reports**: Research agents create structured reports that implementation agents can consume
- **Implementation Logs**: Backend agents document their changes for frontend agents to reference
- **Pattern Documentation**: Agents update CLAUDE.md with new patterns they establish
- **Cross-Reference Maps**: Agents maintain references to related work from other agents

### Error Handling and Recovery Patterns

**Agent Failure Recovery**: Robust patterns for handling agent failures and ensuring task completion.

```bash
# Recovery Strategies:

# 1. Agent Retry with Enhanced Context
Primary agent fails → Retry with additional context and constraints
Still fails → Escalate to more specialized agent or different approach

# 2. Parallel Agent Validation
Critical task → Multiple agents work on same problem with different approaches
Compare outputs → Select best solution or hybrid approach
Validation agent → Reviews multiple solutions and recommends final implementation

# 3. Progressive Agent Specialization
General agent attempts task → Identifies specific domain complexity
Specialized agent takes over → Focuses on complex domain-specific aspects
General agent resumes → Handles remaining general implementation tasks
```

**Failure Prevention Patterns**:
- **Pre-flight Context Validation**: Agents verify they have sufficient context before starting
- **Incremental Checkpoints**: Complex tasks broken into smaller validatable steps
- **Cross-Agent Code Review**: Implementation agents automatically trigger review agents
- **Rollback Capabilities**: Agents can revert changes if subsequent agents identify issues

### Performance Optimization for Agent Orchestration

**Efficiency Patterns**: Optimize agent execution for speed and resource usage.

```bash
# Optimization Strategies:

# 1. Parallel Execution Batching
Group independent tasks → Execute simultaneously rather than sequentially
Reduce total latency → Multiple agents complete faster than sequential execution
Context efficiency → Each agent maintains focused, minimal context

# 2. Selective Agent Activation
Lightweight tasks → Use efficient agents (haiku model) for routine operations
Complex tasks → Reserve high-capability agents (opus model) for critical work
Hybrid approach → Start with efficient agent, escalate to powerful agent if needed

# 3. Context Pre-loading
Agent preparation → Pre-load relevant context documents before agent activation
Shared context pool → Multiple agents access same prepared context efficiently
Incremental context building → Each agent adds to shared context for subsequent agents
```

**Resource Management**:
- **Tool Access Optimization**: Restrict agents to only necessary tools to improve focus and performance
- **Model Selection Strategy**: Use appropriate model capabilities for each agent's complexity requirements
- **Context Window Management**: Maintain clean, focused context to prevent context window exhaustion
- **Concurrent Agent Limits**: Balance parallel execution with system resource constraints

### Agent Orchestration Examples for Billing Dashboard

**Complete Feature Implementation Pattern**:
```bash
# Task: "Implement subscription pause/resume functionality"

# Automatic Agent Orchestration:
1. research-analyst (parallel) → Research pause/resume best practices, ZarinPal implications
2. backend-pattern-expert (after research) → Implement API endpoints, database schema updates
3. frontend-ui-expert (parallel with backend) → Design pause/resume UI components
4. i18n-translation-manager (after frontend) → Add translations for pause/resume messaging
5. code-reviewer (after all) → Review complete implementation for quality and security

# Context Flow:
research-analyst findings → backend-pattern-expert implementation → frontend-ui-expert integration → i18n validation → code quality review
```

**Performance-Critical Implementation Pattern**:
```bash
# Task: "Optimize payment processing performance"

# Strategic Agent Deployment:
1. Multiple research-analyst instances (parallel) →
   - Instance A: Database query optimization research
   - Instance B: ZarinPal API performance best practices
   - Instance C: Caching strategy research

2. backend-pattern-expert (sequential) → Implement optimizations based on research
3. Performance validation agent → Benchmark improvements and validate performance gains
```

## Quality Requirements

**Before Committing**:
- Run `pnpm lint && pnpm check-types` for code quality
- Execute `pnpm i18n:full-check` for translation completeness
- Test database migrations with `pnpm db:migrate:local`
- Verify API documentation at `http://localhost:3000/api/v1/scalar`

**Security Considerations**:
- All routes protected with CSRF middleware
- Rate limiting on authentication endpoints
- No secrets in environment files (use wrangler secrets)
- Audit trail for all billing operations via `billingEvent` table