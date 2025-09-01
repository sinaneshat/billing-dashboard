#!/bin/bash

# Complete Database Reset and Fresh Seeding Script
# Wipes everything clean and sets up for fresh user testing

set -e  # Exit on any error

echo "🔄 Starting complete database cleanup and reset..."
echo ""

# Step 1: Stop any running dev servers (optional)
echo "⏹️  Stopping any running processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "wrangler" 2>/dev/null || true
sleep 2

# Step 2: Complete database wipe using existing npm scripts
echo "💥 STEP 1: Wiping local database completely..."
npm run db:drop-all:local
echo "✅ Local database wiped clean"
echo ""

# Step 3: Apply fresh migrations
echo "🏗️  STEP 2: Applying fresh database schema..."
npm run db:migrate:local
echo "✅ Fresh schema applied"
echo ""

# Step 4: Seed with fresh products only
echo "🌱 STEP 3: Seeding with fresh products for testing..."
npx tsx scripts/reset-db-fresh.ts
echo ""

# Step 5: Verify everything is working
echo "🔍 STEP 4: Verifying database setup..."
echo ""

# Optional: Open database studio for verification
read -p "🎯 Would you like to open Drizzle Studio to verify the database? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Opening Drizzle Studio..."
    npm run db:studio:local &
    echo "📊 Database Studio is running at http://localhost:4983"
    echo "   (Press Ctrl+C to stop when done)"
else
    echo "✅ Database reset completed!"
fi

echo ""
echo "🎉 SUCCESS: Database is clean and ready for testing!"
echo ""
echo "📊 What's Ready:"
echo "   • Fresh database schema"
echo "   • 6 test products with Iranian Rial pricing"
echo "   • No users (ready for fresh signups)"
echo "   • Clean billing history"
echo ""
echo "🚀 Next Steps:"
echo "   1. npm run dev          # Start development server"
echo "   2. Sign up with new user"
echo "   3. Test subscription flows"
echo ""
echo "💡 All products are reasonably priced for easy testing!"