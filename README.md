# 🤖 Roundtable Billing Dashboard

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://typescriptlang.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb)](https://reactjs.org)
[![ZarinPal](https://img.shields.io/badge/ZarinPal-Integrated-success)](https://zarinpal.com)

*Advanced billing solutions for AI collaboration platforms. Multiple AI Models Brainstorm Together.*

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📖 Overview

Roundtable Billing Dashboard is an enterprise-grade billing management platform designed for AI collaboration platforms where multiple AI models brainstorm together. Built with cutting-edge web technologies and deployed on Cloudflare's global edge network, it provides lightning-fast performance, robust security, and comprehensive payment functionality with native ZarinPal integration for the Iranian market.

### 🎯 Key Highlights

- **🤖 AI Platform Focused**: Designed for multi-model AI collaboration billing
- **💳 ZarinPal Native**: Full ZarinPal integration with direct debit (Payman) support
- **🚀 Edge-First Architecture**: Deployed on Cloudflare Workers for global performance
- **🔐 Enterprise Security**: Advanced authentication with Better Auth
- **📊 Comprehensive Billing**: Full subscription lifecycle management
- **🌍 Iranian Market**: Native Persian/RTL support and Iranian Rial handling
- **🎨 Modern UI/UX**: Beautiful, responsive interface with shadcn/ui

---

## ✨ Features

### 💳 Payment & Billing
- **ZarinPal Integration**: Complete payment gateway integration for Iranian market
- **Direct Debit (Payman)**: Automated recurring payments with ZarinPal Payman API
- **Subscription Management**: Full lifecycle management (create, update, cancel, renewals)
- **Payment Methods**: Secure card storage with tokenization
- **Billing History**: Comprehensive transaction logs and invoicing
- **Multi-Model Billing**: Specialized billing for AI collaboration sessions

### 🔐 Authentication & Security
- **Better Auth**: Modern authentication with multiple providers
- **Session Management**: Secure session handling with JWT
- **Role-Based Access**: Granular permission system
- **Account Verification**: Email verification and phone validation
- **Security Monitoring**: Failed login tracking and account lockouts

### 📊 Dashboard & Analytics
- **Real-time Overview**: Live billing metrics and subscription status
- **Revenue Analytics**: Comprehensive financial reporting
- **User Activity**: Detailed audit trails and event logging
- **AI Usage Metrics**: Track multi-model collaboration usage

### 🏗️ Architecture & Infrastructure
- **Cloudflare Workers**: Edge computing for global performance
- **D1 Database**: Serverless SQLite with global replication
- **R2 Storage**: Object storage for files and assets
- **KV Storage**: Low-latency key-value store for caching
- **Email Services**: AWS SES integration for transactional emails

### 🌐 International Features
- **Multi-language**: Built-in internationalization (i18n)
- **Persian Support**: Native RTL and Persian typography
- **Currency Support**: Iranian Rial (IRR) with proper formatting
- **Timezone Handling**: Proper date/time localization

---

## 🛠️ Technology Stack

### Core Framework
- **[Next.js 15.3.2](https://nextjs.org)** - React framework with App Router
- **[React 19.1.0](https://reactjs.org)** - Latest React with concurrent features
- **[TypeScript 5.8.3](https://typescriptlang.org)** - Type-safe development

### Backend & Database
- **[Hono 4.9.1](https://hono.dev)** - Ultrafast web framework for Cloudflare Workers
- **[Drizzle ORM 0.44.4](https://orm.drizzle.team)** - Type-safe database ORM
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Serverless SQLite database
- **[Better Auth 1.3.11](https://better-auth.com)** - Modern authentication solution

### UI & Styling
- **[shadcn/ui](https://ui.shadcn.com)** - High-quality component library
- **[Tailwind CSS 4.1.7](https://tailwindcss.com)** - Utility-first CSS framework
- **[Radix UI](https://radix-ui.com)** - Accessible component primitives
- **[Lucide Icons 0.511.0](https://lucide.dev)** - Beautiful icon library

### Payment Processing
- **[ZarinPal](https://zarinpal.com)** - Iranian payment gateway
- **Direct Debit (Payman)** - Automated recurring payments
- **Card Tokenization** - Secure payment method storage

### Development & Deployment
- **[Cloudflare Workers](https://workers.cloudflare.com)** - Edge computing platform
- **[Wrangler 4.29.1](https://developers.cloudflare.com/workers/wrangler/)** - Cloudflare CLI tool
- **[ESLint](https://eslint.org)** - Code linting and formatting

### Additional Services
- **[React Email 4.0.15](https://react.email)** - Email template system
- **[AWS SES](https://aws.amazon.com/ses/)** - Email delivery service
- **[R2 Storage](https://developers.cloudflare.com/r2/)** - Object storage
- **[TanStack Query 5.77.0](https://tanstack.com/query)** - Data fetching and caching

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js**: Version 22.14.0 or higher
- **pnpm**: Version 10.11.0 or higher
- **Git**: For version control

```bash
# Verify installations
node --version  # Should be 22.14.0+
pnpm --version  # Should be 10.11.0+
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/roundtable/billing-dashboard.git
   cd billing-dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit environment file with your configuration
   ```

4. **Database setup**
   ```bash
   # Generate database schema
   pnpm db:generate

   # Apply migrations
   pnpm db:migrate:local

   # Seed with sample data
   pnpm db:fresh:quick
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your application running!

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in the project root using `.env.example` as template:

#### Required Variables

```bash
# Application Environment
NODE_ENV=development
NEXT_PUBLIC_WEBAPP_ENV=local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication - Generate secure secrets
BETTER_AUTH_SECRET=your-better-auth-secret-32-chars-minimum
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth - Get from Google Cloud Console
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# AWS SES Email - Get from AWS Console
AWS_SES_ACCESS_KEY_ID=your-aws-ses-access-key-id
AWS_SES_SECRET_ACCESS_KEY=your-aws-ses-secret-access-key
NEXT_PUBLIC_AWS_SES_REGION=your-aws-region
NEXT_PUBLIC_FROM_EMAIL=noreply@your-domain.com
NEXT_PUBLIC_SES_REPLY_TO_EMAIL=support@your-domain.com
NEXT_PUBLIC_SES_VERIFIED_EMAIL=noreply@your-domain.com

# ZarinPal Payment Gateway - Get from ZarinPal Dashboard
NEXT_PUBLIC_ZARINPAL_MERCHANT_ID=your-zarinpal-merchant-id
ZARINPAL_ACCESS_TOKEN=your-zarinpal-access-token

# Webhooks - Configure your webhook endpoints
NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL=https://your-webhook-endpoint.com
WEBHOOK_SECRET=your-webhook-secret
```

### ZarinPal Setup

For payment functionality, you'll need ZarinPal credentials:

1. **Development**: Use ZarinPal sandbox credentials
2. **Production**:
   - Register at [ZarinPal](https://zarinpal.com)
   - Obtain your merchant ID and access token
   - Update environment variables

---

## 🗄️ Database

### Schema Overview

The database includes comprehensive tables for:

- **Authentication**: Users, sessions, accounts, verification
- **Billing**: Products, subscriptions, payments, payment methods
- **Audit**: Billing events, webhook events, audit trails

### Database Commands

```bash
# Development
pnpm db:generate         # Generate migrations
pnpm db:migrate:local    # Apply migrations locally
pnpm db:studio:local     # Open Drizzle Studio
pnpm db:fresh:quick      # Reset and seed database

# Preview Environment
pnpm db:migrate:preview  # Apply to preview database
pnpm db:studio:preview   # Studio for preview

# Production
pnpm db:migrate:prod     # Apply to production database
pnpm db:studio:prod      # Studio for production
```

### Data Models

#### User & Authentication
- **Users**: Core user information with security tracking
- **Sessions**: Secure session management with device tracking
- **Accounts**: OAuth and social login integrations

#### Billing & Payments
- **Products**: Subscription plans and AI collaboration packages
- **Subscriptions**: User subscriptions with lifecycle management
- **Payments**: Transaction records with ZarinPal integration
- **Payment Methods**: Tokenized card storage
- **Billing Events**: Comprehensive audit trail

---

## 🏗️ API Structure

### Authentication Endpoints
```
POST   /api/v1/auth/sign-up          # User registration
POST   /api/v1/auth/sign-in          # User login
POST   /api/v1/auth/verify-email     # Email verification
DELETE /api/v1/auth/sign-out         # User logout
```

### Subscription Management
```
GET    /api/v1/subscriptions         # List user subscriptions
POST   /api/v1/subscriptions         # Create subscription
PATCH  /api/v1/subscriptions/:id     # Update subscription
DELETE /api/v1/subscriptions/:id     # Cancel subscription
```

### Payment Processing
```
GET    /api/v1/payments              # Payment history
POST   /api/v1/payments              # Create payment
POST   /api/v1/payments/verify       # Verify ZarinPal payment
```

### Payment Methods
```
GET    /api/v1/payment-methods       # List saved cards
POST   /api/v1/payment-methods       # Add payment method
DELETE /api/v1/payment-methods/:id   # Remove payment method
```

### System & Health
```
GET    /api/v1/system/health         # Health check
GET    /api/v1/system/status         # System status
```

---

## 🚀 Deployment

### Cloudflare Workers Deployment

#### Prerequisites
1. Cloudflare account with Workers enabled
2. Domain configured in Cloudflare
3. D1 database created
4. R2 buckets configured

#### Deployment Commands

```bash
# Preview deployment
pnpm deploy:preview

# Production deployment
pnpm deploy:production

# Quick preview build
pnpm preview
```

#### Environment Setup

1. **Create D1 Databases**
   ```bash
   wrangler d1 create billing-dashboard-d1-preview
   wrangler d1 create billing-dashboard-d1-prod
   ```

2. **Create R2 Buckets**
   ```bash
   wrangler r2 bucket create billing-dashboard-uploads-preview
   wrangler r2 bucket create billing-dashboard-uploads-prod
   ```

3. **Set Environment Secrets**
   ```bash
   # Preview environment
   wrangler secret put BETTER_AUTH_SECRET --env preview
   wrangler secret put ZARINPAL_ACCESS_TOKEN --env preview

   # Production environment
   wrangler secret put BETTER_AUTH_SECRET --env production
   wrangler secret put ZARINPAL_ACCESS_TOKEN --env production
   ```

4. **Deploy Database Schema**
   ```bash
   # Preview
   pnpm db:migrate:preview

   # Production
   pnpm db:migrate:prod
   ```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] DNS records configured
- [ ] SSL certificates active
- [ ] ZarinPal production credentials set
- [ ] AWS SES configured for emails
- [ ] Monitoring and alerts set up

---

## 🔧 Development

### Development Workflow

```bash
# Start development server
pnpm dev

# Run linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm check-types

# Database development
pnpm db:studio:local

# Email template development
pnpm email:preview
```

### Code Quality

- **ESLint**: Code linting with Antfu config
- **TypeScript**: Strict type checking
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates
- **Commitlint**: Conventional commit messages

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected app routes
│   ├── auth/              # Authentication pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── billing/           # Billing components
│   └── dashboard/         # Dashboard components
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── db/                    # Database schema and migrations
├── emails/                # Email templates
├── i18n/                  # Internationalization
└── api/                   # Backend API implementation
```

---

## 📚 Documentation

### Additional Resources

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [Backend Patterns](./docs/backend-patterns.md) - Backend architecture patterns
- [Frontend Patterns](./docs/frontend-patterns.md) - Frontend development patterns

### Features Documentation

#### Billing System
- Comprehensive subscription lifecycle management
- Automated recurring billing with ZarinPal Direct Debit
- Proration handling for plan changes
- Failed payment retry logic with exponential backoff

#### Security Features
- JWT-based authentication with Better Auth
- CSRF protection and secure headers
- Rate limiting on all API endpoints
- Secure card tokenization

#### Performance Optimizations
- Edge-first architecture with Cloudflare Workers
- Database connection pooling
- Aggressive caching strategies
- Image optimization with Next.js

---

## 🔧 Available Scripts

### Development
```bash
pnpm dev                    # Start development with turbo
pnpm build                  # Build for production
pnpm lint                   # Run ESLint
pnpm lint:fix               # Fix ESLint issues
pnpm check-types            # TypeScript type checking
pnpm lint:modified          # Lint only modified files
```

### Database Management
```bash
pnpm db:generate            # Generate Drizzle migrations
pnpm db:migrate:local       # Apply migrations locally
pnpm db:migrate:preview     # Apply migrations to preview
pnpm db:migrate:prod        # Apply migrations to production
pnpm db:studio:local        # Open Drizzle Studio
pnpm db:fresh:quick         # Reset and seed database quickly
pnpm db:full-reset:local    # Complete database reset
```

### Cloudflare Deployment
```bash
pnpm cf-typegen            # Generate CloudflareEnv types
pnpm preview               # Build and preview worker locally
pnpm deploy:preview        # Deploy to preview environment
pnpm deploy:production     # Deploy to production
```

### Testing & Quality
```bash
pnpm i18n:full-check       # Check all i18n translations
pnpm i18n:validate         # Validate translation structure
pnpm i18n:check-unused     # Find unused translation keys
```

---

## 🙏 Acknowledgments

- **[Roundtable](https://roundtable.now)** - For creating this advanced AI collaboration billing platform
- **[ZarinPal](https://zarinpal.com)** - For providing robust Iranian payment processing solutions
- **[Next.js](https://nextjs.org)** - For the amazing React framework
- **[Cloudflare](https://cloudflare.com)** - For the edge computing platform
- **[shadcn](https://twitter.com/shadcn)** - For the beautiful UI component library
- **Open-source community** - For contributions, feedback, and continuous improvement

---

## 🆘 Support

- **Documentation**: Check our [docs](./docs/) directory
- **Issues**: [GitHub Issues](https://github.com/roundtable/billing-dashboard/issues)
- **Repository**: [GitHub Repository](https://github.com/roundtable/billing-dashboard)

---

<div align="center">

**Roundtable Billing Dashboard**

*Advanced billing solutions for AI collaboration platforms. Multiple AI Models Brainstorm Together.*

*Built by [Roundtable](https://roundtable.now/) for the AI collaboration community*

</div>