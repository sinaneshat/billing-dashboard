'use client';

import Link from 'next/link';

import { Logo } from '@/components/logo/index';
import { BRAND } from '@/constants/brand';

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-svh bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        {/* Primary gradient orb */}
        <div className="absolute start-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl" />
        {/* Secondary gradient orb */}
        <div className="absolute end-1/4 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-chart-2/5 blur-3xl delay-1000" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-8 p-6 md:p-10">
        {/* Animated content wrapper */}
        <div className="flex w-full max-w-sm flex-col gap-8 animate-fade-in-up">
          {/* Logo section with animation */}
          <div className="flex flex-col items-center gap-2 animate-fade-in">
            <Link
              href="/"
              className="group flex items-center gap-3 transition-transform duration-300 hover:scale-105"

            >
              <Logo
                size="md"
                variant="full"
                className="transition-all duration-500 ease-out"
              />
            </Link>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome to
                {' '}
                {BRAND.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Your billing dashboard
              </p>
            </div>
          </div>

          {/* Auth form content */}
          <div className="animate-fade-in-up delay-200">
            {children}
          </div>
        </div>

        {/* Enhanced footer with animations */}
        <div className="w-full max-w-sm animate-fade-in delay-500">
          <div className="space-y-4 text-center text-xs text-muted-foreground">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link
                href={BRAND.legal.terms}
                className="transition-colors hover:text-primary underline underline-offset-4"
              >
                Terms of Service
              </Link>
              <Link
                href={BRAND.legal.privacy}
                className="transition-colors hover:text-primary underline underline-offset-4"

              >
                Privacy Policy
              </Link>
            </div>
            <p className="opacity-70">
              {BRAND.venture}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
