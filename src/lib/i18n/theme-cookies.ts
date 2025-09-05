'use server';

import { cookies } from 'next/headers';

type Theme = 'light' | 'dark' | 'system';

const themes: Theme[] = ['light', 'dark', 'system'];
const defaultTheme: Theme = 'system';

/**
 * Server action to set the user's theme preference in a cookie
 * This follows the next-themes pattern for server-side theme persistence
 */
export async function setUserTheme(theme: Theme) {
  // Validate that the theme is supported
  if (!themes.includes(theme)) {
    throw new Error(`Unsupported theme: ${theme}`);
  }

  const cookieStore = await cookies();

  try {
    // Set the theme cookie with proper security settings
    cookieStore.set('NEXT_THEME', theme, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    // Return success - client will handle refresh
    return { success: true, theme };
  } catch (error) {
    console.error('Failed to set theme cookie:', error);
    throw new Error('Failed to update theme preference');
  }
}

/**
 * Get the current theme from cookies (server-side)
 * This is used internally by the request config
 */
export async function getUserTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('NEXT_THEME');

  if (themeCookie?.value && themes.includes(themeCookie.value as Theme)) {
    return themeCookie.value as Theme;
  }

  // Fallback to default theme
  return defaultTheme;
}

/**
 * Clear the theme cookie (useful for logout or reset)
 */
export async function clearUserTheme() {
  const cookieStore = await cookies();
  cookieStore.delete('NEXT_THEME');
}
