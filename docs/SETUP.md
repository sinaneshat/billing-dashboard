# 🚀 Deadpixel Billing Dashboard - Complete Setup Guide

Welcome to the Deadpixel Billing Dashboard! This comprehensive guide will walk you through setting up the project from scratch.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Minimal Setup)](#quick-start-minimal-setup)
3. [Full Development Setup](#full-development-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js**: Version 22.14.0 or higher
  - Download from: https://nodejs.org/
  - Verify: `node --version`
- **pnpm**: Version 10.10.0 or higher
  - Install: `npm install -g pnpm`
  - Verify: `pnpm --version`

### Optional (for full features)
- **Git**: For version control
- **VS Code**: Recommended editor with extensions
- **Cloudflare Account**: For production deployment
- **AWS Account**: For email services (SES)
- **ZarinPal Account**: For Iranian payment processing

---

## 🚀 Quick Start (Minimal Setup)

Get up and running in 5 minutes with basic functionality:

### Step 1: Clone and Install
```bash
# Clone the repository
git clone https://github.com/your-org/billing-dashboard.git
cd billing-dashboard

# Install dependencies
pnpm install
```

### Step 2: Basic Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env file - only change these for basic setup:
NODE_ENV=development
# Database: Uses ./local.db for local development, D1 bindings for production
BETTER_AUTH_SECRET=your-random-32-character-secret-key-here
```

### Step 3: Initialize Database
```bash
# Generate database schema
pnpm db:generate

# Apply migrations
pnpm db:migrate:local

# (Optional) Seed with sample data
pnpm db:init:local
```

### Step 4: Start Development Server
```bash
pnpm dev
```

🎉 **You're ready!** Visit http://localhost:3000

---

## 🛠️ Full Development Setup

For complete functionality including authentication, payments, and email:

### Step 1: Complete Environment Configuration

Open `.env` and configure the following sections:

#### 🔐 Authentication (Required for user features)
```env
# Generate a secure secret:
# openssl rand -base64 32
BETTER_AUTH_SECRET=your-secure-32-character-secret

# Google OAuth (recommended)
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
```

**Setting up Google OAuth:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

#### 💳 ZarinPal Payment Gateway (For Iranian payments)
```env
NEXT_PUBLIC_ZARINPAL_MERCHANT_ID=your-merchant-id-uuid
ZARINPAL_ACCESS_TOKEN=your-access-token
```

**Setting up ZarinPal:**
1. Visit [ZarinPal Panel](https://next.zarinpal.com/panel/)
2. Register and complete merchant verification
3. Navigate to API section
4. Copy Merchant ID and Access Token

#### 📧 Email Services (AWS SES)
```env
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com
```

**Setting up AWS SES:**
1. Visit [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your sending domain/email
3. Create IAM user with SES permissions
4. Generate access keys

#### 🛡️ Security (Cloudflare Turnstile)
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

**Setting up Turnstile:**
1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to Turnstile section
3. Create a new site
4. Add your domain (use `localhost:3000` for development)

### Step 2: Advanced Database Setup

#### Local Development (SQLite)
```bash
# Full reset with seed data
pnpm db:full-reset-all:local

# Or step by step:
pnpm db:drop-all:local    # Clear database
pnpm db:migrate:local     # Apply schema
pnpm db:init:local        # Seed initial data
```

#### Database Management Commands
```bash
# View database in browser
pnpm db:studio:local

# Generate new migration
pnpm db:generate

# Push changes directly (development only)
pnpm db:push
```

### Step 3: Development Workflow

#### Start Development Server
```bash
# Start with Turbo (recommended)
pnpm dev

# Alternative development commands
pnpm dev:email    # Email template development (port 3001)
```

#### Code Quality
```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm check-types

# Run tests
pnpm test
```

---

## 🔧 Environment Configuration

### Required Variables
```env
NODE_ENV=development
# Database: Uses ./local.db for local development, D1 bindings for production
BETTER_AUTH_SECRET=your-secret-key
```

### Optional Variables
```env
# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# ZarinPal
NEXT_PUBLIC_ZARINPAL_MERCHANT_ID=00000000-0000-0000-0000-000000000000
ZARINPAL_ACCESS_TOKEN=your-access-token

# AWS SES Email
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
FROM_EMAIL=noreply@yourdomain.com

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

### Environment Files Structure
- `.env` - Main environment file (not committed)
- `.env.example` - Template with documentation
- `.env.local` - Local overrides (not committed)
- `.dev.vars` - Cloudflare Workers development variables

---

## 🗄️ Database Setup

This project uses **Drizzle ORM** with support for multiple database providers:

### Local Development (SQLite)
```bash
# Initialize local database
pnpm db:migrate:local
pnpm db:init:local
```

### Cloudflare D1 (Production)
```bash
# Setup Cloudflare D1
pnpm cf-setup

# Migrate to preview environment
pnpm db:migrate:preview

# Migrate to production
pnpm db:migrate:prod
```

### Database Commands Reference
```bash
# Schema Management
pnpm db:generate    # Generate migrations from schema changes
pnpm db:push        # Push schema directly (dev only)
pnpm db:migrate     # Apply migrations

# Data Management
pnpm db:studio:local     # Open Drizzle Studio
pnpm db:init:local       # Seed initial data
pnpm db:reset:local      # Reset and reseed

# Environment-specific
pnpm db:migrate:local    # Local SQLite
pnpm db:migrate:preview  # Cloudflare D1 Preview
pnpm db:migrate:prod     # Cloudflare D1 Production
```

---

## 🏃‍♂️ Running the Application

### Development
```bash
# Start development server
pnpm dev              # Next.js with Turbo
pnpm dev:email        # Email development server (port 3001)
```

### Production Build
```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Build with bundle analysis
pnpm build-stats
```

### Cloudflare Deployment
```bash
# Build for Cloudflare
pnpm build:opennext

# Preview deployment
pnpm preview

# Deploy to preview
pnpm deploy:preview

# Deploy to production
pnpm deploy:production
```

---

## 🧪 Testing

### Running Tests
```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Email Template Testing
```bash
# Start email development server
pnpm dev:email

# Build email templates
pnpm email:build

# Export email templates
pnpm email:export
```

---

## 🚀 Deployment

### Cloudflare Pages (Recommended)

#### Prerequisites
1. Cloudflare account
2. Wrangler CLI: `npm install -g wrangler`
3. Login: `wrangler login`

#### Deployment Steps
```bash
# 1. Generate Cloudflare types
pnpm cf-typegen

# 2. Build for Cloudflare
pnpm build:opennext

# 3. Deploy to preview
pnpm deploy:preview

# 4. Deploy to production
pnpm deploy:production
```

#### Environment Variables Setup
In Cloudflare Dashboard:
1. Go to Pages → Your Project → Settings → Environment variables
2. Add all production environment variables
3. Configure D1 database binding

### Traditional Hosting
```bash
# Build for traditional hosting
pnpm build

# Start production server
pnpm start
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check database file permissions
ls -la local.db

# Recreate database
pnpm db:drop-all:local
pnpm db:migrate:local
```

#### 2. Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check syntax (no spaces around =)
NODE_ENV=development  ✅
NODE_ENV = development  ❌
```

#### 3. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
pnpm dev -- -p 3001
```

#### 4. TypeScript Errors
```bash
# Regenerate types
pnpm cf-typegen

# Check types
pnpm check-types
```

#### 5. Build Errors
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Getting Help

1. **Check logs**: Development server logs are shown in terminal
2. **Database issues**: Use `pnpm db:studio:local` to inspect data
3. **Type issues**: Run `pnpm check-types` for detailed errors
4. **Build issues**: Try `pnpm clean` then rebuild

---

## ⚡ Advanced Configuration

### Custom Hooks and Scripts

The project supports custom hooks for advanced workflows:

```bash
# Install Claude Flow (optional)
npm install -g @ruv/claude-flow

# Initialize swarm development (advanced)
claude-flow init
```

### Performance Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
pnpm build-stats
```

#### Database Optimization
```bash
# Database configuration:
# - Local development: Uses ./local.db (SQLite)
# - Production: Uses Cloudflare D1 bindings (env.DB)
# - No DATABASE_URL needed - uses native database bindings
```

### VS Code Configuration

Recommended extensions:
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- Drizzle Kit

Workspace settings are in `.vscode/settings.json`.

### Email Development

Develop emails locally:
```bash
# Start email server
pnpm dev:email

# Visit http://localhost:3001 to see templates
# Templates are in src/emails/
```

### RTL Support

The project includes RTL (Right-to-Left) support:
- RTL styles in `src/components/rtl/`
- Arabic/Persian language support
- Direction-aware components

---

## 🎯 Next Steps

After setup, explore:

1. **Dashboard**: Navigate to `/dashboard`
2. **Authentication**: Set up Google OAuth for user login
3. **Payments**: Configure ZarinPal for Iranian market
4. **Email**: Set up transactional emails with AWS SES
5. **Deployment**: Deploy to Cloudflare Pages

### Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Better Auth](https://www.better-auth.com/)
- [ZarinPal Documentation](https://next.zarinpal.com/panel/document/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and commit: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

**Need help?** Open an issue or contact the development team.

Happy coding! 🚀