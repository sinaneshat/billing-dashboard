# 💳 ZarinPal Payment Dashboard

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://typescriptlang.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![ZarinPal](https://img.shields.io/badge/ZarinPal-Integrated-success)](https://zarinpal.com)

*Open-source, white-labelable payment dashboard built for ZarinPal integration*

[Features](#-features) • [Quick Start](#-quick-start) • [White-labeling](#-white-labeling) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📖 Overview

ZarinPal Payment Dashboard is an open-source, enterprise-grade billing management platform designed specifically for businesses using ZarinPal payment gateway. Built with cutting-edge web technologies and deployed on Cloudflare's global edge network, it provides lightning-fast performance, robust security, and comprehensive payment functionality with full white-labeling capabilities.

### 🎯 Key Highlights

- **🏷️ White-labelable**: Complete branding customization with environment-based configuration
- **💳 ZarinPal Native**: Full ZarinPal integration with direct debit (Payman) support
- **🚀 Edge-First Architecture**: Deployed on Cloudflare Workers for global performance
- **🔐 Enterprise Security**: Advanced authentication with Better Auth
- **📊 Comprehensive Billing**: Full subscription lifecycle management
- **🌍 Open Source**: MIT licensed for community contribution and customization
- **🎨 Modern UI/UX**: Beautiful, responsive interface with shadcn/ui

---

## 🏷️ White-labeling

This dashboard is designed to be completely white-labelable, allowing businesses to customize branding, colors, logos, and content to match their brand identity while maintaining the powerful ZarinPal payment functionality.

### 🎨 Customization Capabilities

#### Brand Identity
- **Company Name & Logo**: Environment-based logo and brand name configuration
- **Color Scheme**: Primary, secondary, and accent color customization
- **Typography**: Custom font loading and typography styles
- **Favicon & Icons**: Custom favicon and app icons
- **Domain & URLs**: Custom domain configuration

#### Content Customization
- **Dashboard Copy**: All text content is configurable through environment variables
- **Email Templates**: Customizable transactional email templates
- **Legal Pages**: Terms of service, privacy policy, and other legal content
- **Help Documentation**: Custom help content and support links

#### UI/UX Customization
- **Layout Options**: Different layout variations and component arrangements
- **Theme Variants**: Light/dark mode with custom theme configurations
- **Component Styling**: Override default component styles with custom CSS
- **Navigation**: Customizable navigation structure and menu items

### ⚙️ Environment-Based Configuration

Configure your white-label instance through environment variables:

```bash
# Brand Configuration
NEXT_PUBLIC_BRAND_NAME="Your Company Name"
NEXT_PUBLIC_BRAND_LOGO_URL="/your-logo.svg"
NEXT_PUBLIC_BRAND_FAVICON="/your-favicon.ico"
NEXT_PUBLIC_BRAND_PRIMARY_COLOR="#your-color"
NEXT_PUBLIC_BRAND_SECONDARY_COLOR="#your-color"

# Domain & URLs
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_SUPPORT_URL="https://your-support.com"
NEXT_PUBLIC_DOCS_URL="https://your-docs.com"

# Company Information
NEXT_PUBLIC_COMPANY_ADDRESS="Your Company Address"
NEXT_PUBLIC_COMPANY_PHONE="+1234567890"
NEXT_PUBLIC_COMPANY_EMAIL="support@yourcompany.com"

# Legal & Compliance
NEXT_PUBLIC_TERMS_URL="https://your-terms.com"
NEXT_PUBLIC_PRIVACY_URL="https://your-privacy.com"
NEXT_PUBLIC_COOKIES_URL="https://your-cookies.com"

# Features Toggle
NEXT_PUBLIC_ENABLE_SIGNUP="true"
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN="true"
NEXT_PUBLIC_ENABLE_DIRECT_DEBIT="true"
```

### 📋 White-labeling Guidelines

#### ✅ **DO's**

**Branding & Identity**
- ✅ Replace all logos, colors, and brand elements with your own
- ✅ Customize email templates to match your brand voice
- ✅ Update legal pages (Terms, Privacy Policy) with your company details
- ✅ Configure custom domain and SSL certificates
- ✅ Customize error pages and loading states

**Content & Copy**
- ✅ Modify all user-facing text to match your brand tone
- ✅ Translate content to your target language/locale
- ✅ Add your own help documentation and FAQs
- ✅ Customize notification messages and alerts

**Technical Customization**
- ✅ Override CSS variables for theming
- ✅ Add custom fonts through font loading
- ✅ Implement custom analytics tracking
- ✅ Add your own monitoring and error tracking

**ZarinPal Integration**
- ✅ Use your own ZarinPal merchant credentials
- ✅ Customize payment descriptions and metadata
- ✅ Configure your own webhook endpoints
- ✅ Set up your payment success/failure URLs

#### ❌ **DON'Ts**

**Attribution & Copyright**
- ❌ Remove copyright notices from source code
- ❌ Claim original authorship of the codebase
- ❌ Remove MIT license references
- ❌ Redistribute without including original license

**Core Functionality**
- ❌ Modify core ZarinPal integration logic without understanding implications
- ❌ Remove security features or authentication mechanisms
- ❌ Bypass payment verification processes
- ❌ Disable audit logging or transaction records

**Technical Restrictions**
- ❌ Hardcode sensitive credentials in source code
- ❌ Remove environment variable validation
- ❌ Disable HTTPS in production environments
- ❌ Remove database migration safety checks

**Compliance & Legal**
- ❌ Remove data protection compliance features
- ❌ Bypass user consent mechanisms
- ❌ Remove audit trails required for financial compliance
- ❌ Disable security headers and CSRF protection

### 🚫 Limitations

#### Technical Limitations
- **Database Schema**: Core payment and user tables cannot be modified without breaking functionality
- **API Contracts**: ZarinPal API integration points must remain intact
- **Security Features**: Core security mechanisms (auth, CSRF, rate limiting) cannot be disabled
- **Audit Requirements**: Financial transaction logging cannot be removed

#### ZarinPal Specific
- **Payment Gateway**: Must use ZarinPal as the payment provider (cannot be replaced)
- **Currency**: Limited to Iranian Rial (IRR) transactions
- **Compliance**: Must follow ZarinPal's terms of service and compliance requirements
- **Direct Debit**: Payman (Direct Debit) features are ZarinPal-specific

#### Licensing & Legal
- **Open Source**: Must comply with MIT license terms
- **Attribution**: Original project attribution must remain in documentation
- **Redistribution**: Source code modifications must maintain license compatibility
- **Commercial Use**: Permitted under MIT license with proper attribution

#### Feature Constraints
- **Core Billing Logic**: Subscription and payment processing logic should not be modified
- **Data Models**: Core database relationships must be preserved
- **API Endpoints**: Core API structure should remain intact for integration compatibility
- **Security Standards**: Cannot remove or bypass security features

### 🛠️ Implementation Guide

#### Step 1: Environment Setup
1. Copy `.env.example` to `.env`
2. Configure all `NEXT_PUBLIC_BRAND_*` variables
3. Set up custom domain and SSL
4. Configure ZarinPal credentials

#### Step 2: Asset Replacement
1. Replace logo files in `/public/static/`
2. Update favicon and app icons
3. Add custom fonts to `/public/fonts/`
4. Update manifest.json with your app details

#### Step 3: Style Customization
1. Override CSS variables in `/src/app/globals.css`
2. Customize component themes in `/src/components/ui/`
3. Update color schemes in Tailwind config
4. Test responsive design across devices

#### Step 4: Content Updates
1. Update all text content through environment variables
2. Customize email templates in `/src/emails/`
3. Update legal pages and help documentation
4. Configure support and contact information

#### Step 5: Testing & Validation
1. Test payment flows with ZarinPal sandbox
2. Verify all branding elements display correctly
3. Test email templates and notifications
4. Validate mobile responsiveness

---

## ✨ Features

### 💳 Payment & Billing
- **ZarinPal Integration**: Complete payment gateway integration for Iranian market
- **Direct Debit (Payman)**: Automated recurring payments with ZarinPal Payman API
- **Subscription Management**: Full lifecycle management (create, update, cancel, renewals)
- **Payment Methods**: Secure card storage with tokenization
- **Billing History**: Comprehensive transaction logs and invoicing
- **Proration & Credits**: Intelligent handling of plan changes and refunds

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
- **Performance Metrics**: Billing success rates and payment analytics

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
- **[Hono](https://hono.dev)** - Ultrafast web framework for Cloudflare Workers
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database ORM
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Serverless SQLite database
- **[Better Auth](https://better-auth.com)** - Modern authentication solution

### UI & Styling
- **[shadcn/ui](https://ui.shadcn.com)** - High-quality component library
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Radix UI](https://radix-ui.com)** - Accessible component primitives
- **[Lucide Icons](https://lucide.dev)** - Beautiful icon library

### Payment Processing
- **[ZarinPal](https://zarinpal.com)** - Iranian payment gateway
- **Direct Debit (Payman)** - Automated recurring payments
- **Card Tokenization** - Secure payment method storage

### Development & Deployment
- **[Cloudflare Workers](https://workers.cloudflare.com)** - Edge computing platform
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** - Cloudflare CLI tool
- **[Vitest](https://vitest.dev)** - Fast unit testing framework
- **[ESLint](https://eslint.org)** - Code linting and formatting

### Additional Services
- **[React Email](https://react.email)** - Email template system
- **[AWS SES](https://aws.amazon.com/ses/)** - Email delivery service
- **[R2 Storage](https://developers.cloudflare.com/r2/)** - Object storage
- **[Turnstile](https://developers.cloudflare.com/turnstile/)** - CAPTCHA protection

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js**: Version 22.14.0 or higher
- **pnpm**: Version 10.10.0 or higher
- **Git**: For version control

```bash
# Verify installations
node --version  # Should be 22.14.0+
pnpm --version  # Should be 10.10.0+
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/zarinpal-payment-dashboard.git
   cd zarinpal-payment-dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   cp .dev.vars.example .dev.vars
   
   # Edit environment files with your configuration
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

Create `.env` and `.dev.vars` files in the project root:

#### Required Variables

```bash
# Basic Configuration
NODE_ENV=development
NEXT_PUBLIC_WEBAPP_ENV=local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Database (uses Cloudflare D1 bindings in production, ./local.db for local development)

# ZarinPal Configuration (Required for payments)
ZARINPAL_MERCHANT_ID=36e0ea98-43fa-400d-a421-f7593b1c73bc  # Sandbox
ZARINPAL_ACCESS_TOKEN=zp-sandbox-access-token              # Sandbox
```

#### White-labeling Variables

```bash
# Brand Configuration
NEXT_PUBLIC_BRAND_NAME="YourCompany Payment Hub"
NEXT_PUBLIC_BRAND_LOGO_URL="/assets/your-logo.svg"
NEXT_PUBLIC_BRAND_FAVICON="/assets/your-favicon.ico"
NEXT_PUBLIC_BRAND_PRIMARY_COLOR="#2563eb"
NEXT_PUBLIC_BRAND_SECONDARY_COLOR="#64748b"
NEXT_PUBLIC_BRAND_ACCENT_COLOR="#10b981"

# Company Information
NEXT_PUBLIC_COMPANY_NAME="Your Company Ltd."
NEXT_PUBLIC_COMPANY_ADDRESS="123 Business Street, Tehran, Iran"
NEXT_PUBLIC_COMPANY_PHONE="+98 21 1234 5678"
NEXT_PUBLIC_COMPANY_EMAIL="support@yourcompany.com"
NEXT_PUBLIC_COMPANY_WEBSITE="https://yourcompany.com"

# Support & Documentation
NEXT_PUBLIC_SUPPORT_URL="https://support.yourcompany.com"
NEXT_PUBLIC_DOCS_URL="https://docs.yourcompany.com"
NEXT_PUBLIC_HELP_URL="https://help.yourcompany.com"

# Legal Pages
NEXT_PUBLIC_TERMS_URL="https://yourcompany.com/terms"
NEXT_PUBLIC_PRIVACY_URL="https://yourcompany.com/privacy"
NEXT_PUBLIC_COOKIES_URL="https://yourcompany.com/cookies"
```

#### Optional Variables

```bash
# Email Services (AWS SES)
AWS_SES_ACCESS_KEY_ID=your-aws-access-key
AWS_SES_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_SES_REGION=us-east-1

# Security
TURNSTILE_SECRET_KEY=your-turnstile-secret
SIGNED_URL_SECRET=your-signed-url-secret

# External Integrations
EXTERNAL_WEBHOOK_URL=https://your-domain.com/webhooks

# Card Verification (ZarinPal)
CARD_VERIFICATION_AMOUNT=1000
CARD_VERIFICATION_DESCRIPTION=Card verification for billing

# Feature Toggles
NEXT_PUBLIC_ENABLE_SIGNUP="true"
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN="false"
NEXT_PUBLIC_ENABLE_DIRECT_DEBIT="true"
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
```

### ZarinPal Setup

For payment functionality, you'll need ZarinPal credentials:

1. **Development**: Use the provided sandbox credentials
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
pnpm db:generate     # Generate migrations
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
- **Products**: Subscription plans and one-time purchases
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
POST   /api/v1/payments              # Create payment
POST   /api/v1/payments/verify       # Verify ZarinPal payment
GET    /api/v1/payments/history      # Payment history
```

### Payment Methods
```
GET    /api/v1/payment-methods       # List saved cards
POST   /api/v1/payment-methods       # Add payment method
DELETE /api/v1/payment-methods/:id   # Remove payment method
```

### Direct Debit (Payman)
```
POST   /api/v1/direct-debit/contract     # Create contract
GET    /api/v1/direct-debit/banks        # List available banks
POST   /api/v1/direct-debit/verify       # Verify contract
POST   /api/v1/direct-debit/charge       # Charge via contract
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/api/auth.test.ts
```

### Testing Strategy

- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing with Playwright
- **Payment Testing**: ZarinPal sandbox integration tests

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

# Quick preview
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
└── api/                   # Backend API implementation
```

---

## 📚 Documentation

### Additional Resources

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [API Documentation](./docs/api/) - Complete API reference
- [Architecture Guide](./docs/architecture/) - System architecture
- [External API Guide](./docs/EXTERNAL_API.md) - External integrations

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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Write comprehensive tests
- Document new features
- Follow conventional commit format

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[ZarinPal](https://zarinpal.com)** - For providing robust Iranian payment processing solutions
- **[DeadPixel](https://www.deadpixel.ai/)** - For founding and supporting this open-source project
- **[Next.js](https://nextjs.org)** - For the amazing React framework
- **[Cloudflare](https://cloudflare.com)** - For the edge computing platform
- **[shadcn](https://twitter.com/shadcn)** - For the beautiful UI component library
- **Open-source community** - For contributions, feedback, and continuous improvement

---

## 🆘 Support

- **Documentation**: Check our [docs](./docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/zarinpal-payment-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/zarinpal-payment-dashboard/discussions)

---

<div align="center">

**Open-source ZarinPal payment dashboard**

*Founded and supported by [DeadPixel](https://www.deadpixel.ai/) • MIT Licensed for community use*

</div>
