import { FrownIcon } from 'lucide-react';
import Link from 'next/link';

export default function NotFoundScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <FrownIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold tracking-tighter leading-tight text-foreground sm:text-4xl md:text-5xl">
          Oops, page not found!
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          The page you were looking for could not be found. Please check the URL
          or try navigating back to the homepage.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium leading-relaxed text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
