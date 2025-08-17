# Billing Dashboard Boilerplate

A modern, secure authentication and billing dashboard boilerplate built with Next.js, Better Auth, and Cloudflare Workers.

## Features

- 🔐 **Secure Authentication**: Built with Better Auth for robust user authentication
- 🚀 **Edge-Ready**: Deployed on Cloudflare Workers for global performance
- 💾 **Database**: Cloudflare D1 for serverless SQL database
- 🎨 **Modern UI**: Built with Tailwind CSS and Shadcn/ui components
- 📧 **Email Support**: React Email templates for transactional emails
- 🔒 **Type-Safe**: Full TypeScript support throughout

## Quick Start

### Prerequisites

- Node.js 22.14.0 or higher
- pnpm package manager
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd billing-dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Authentication
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Database
DATABASE_URL=your-database-url

# Email (optional)
AWS_SES_ACCESS_KEY_ID=your-ses-key
AWS_SES_SECRET_ACCESS_KEY=your-ses-secret
AWS_SES_REGION=us-east-1
```

5. Initialize the database:
```bash
pnpm db:migrate:local
```

6. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
src/
├── app/               # Next.js app router pages
│   ├── auth/         # Authentication pages
│   └── dashboard/    # Dashboard pages
├── api/              # API routes (Hono)
│   ├── routes/       # API endpoints
│   └── middleware/   # API middleware
├── components/       # React components
│   ├── ui/          # UI components
│   └── auth/        # Auth components
├── lib/             # Utility libraries
│   └── auth/        # Auth configuration
└── db/              # Database schema
```

## Authentication

This boilerplate uses Better Auth for authentication with the following features:

- Email/password authentication
- Magic link authentication
- Session management
- Protected routes

### Protected Routes

To protect a route, use the `requireAuth` function:

```typescript
import { requireAuth } from '@/app/auth/actions';

export default async function ProtectedPage() {
  await requireAuth();
  
  return <div>Protected content</div>;
}
```

## API Routes

The API is built with Hono and includes:

- `/api/v1/system/health` - Health check endpoint
- `/api/v1/auth/*` - Authentication endpoints (handled by Better Auth)

## Database

Using Cloudflare D1 with Drizzle ORM:

```bash
# Generate migrations
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Apply migrations to preview
pnpm db:migrate:preview

# Apply migrations to production
pnpm db:migrate:prod
```

## Deployment

### Deploy to Cloudflare Workers

1. Configure Wrangler:
```bash
pnpm wrangler login
```

2. Build the application:
```bash
pnpm build:opennext
```

3. Deploy to preview:
```bash
pnpm deploy:preview
```

4. Deploy to production:
```bash
pnpm deploy:production
```

## Customization

### Update Branding

Edit `src/constants/brand.ts` to customize:
- Application name
- Colors
- URLs
- Social links

### Add New Pages

1. Create a new file in `src/app/`
2. Add authentication if needed
3. Update navigation in components

### Extend the API

1. Create new route handlers in `src/api/routes/`
2. Add to the main API in `src/api/index.ts`
3. Update OpenAPI documentation

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm check-types` - TypeScript type checking
- `pnpm db:studio:local` - Open Drizzle Studio

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.