// ============================================================
//  Hooks untuk responsive design — deteksi breakpoint & device.
// ============================================================

'use client';

import { useEffect, useState } from 'react';

const QUERIES = {
  xs: '(max-width: 419px)',
  sm: '(min-width: 420px) and (max-width: 639px)',
  md: '(min-width: 640px) and (max-width: 767px)',
  lg: '(min-width: 768px) and (max-width: 1023px)',
  xl: '(min-width: 1024px) and (max-width: 1279px)',
  '2xl': '(min-width: 1280px) and (max-width: 1399px)',
  '3xl': '(min-width: 1400px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  touch: '(pointer: coarse)',
  fine: '(pointer: fine)',
} as const;

type Breakpoint = keyof typeof QUERIES;

/**
 * Dengarkan perubahan media query.
 * Mengembalikan `true` jika media query match, `false` jika tidak.
 * Server-side selalu return `false` (initial state).
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (q: string): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(q).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Deteksi apakah device adalah mobile (lebar <= 767px).
 * Includes small tablets.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(QUERIES.mobile);
}

/**
 * Deteksi apakah device adalah tablet (lebar 768px - 1023px).
 */
export function useIsTablet(): boolean {
  return useMediaQuery(QUERIES.tablet);
}

/**
 * Deteksi apakah device adalah desktop (lebar >= 1024px).
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(QUERIES.desktop);
}

/**
 * Deteksi apakah pointer device adalah touch (coarse pointer).
 * Berguna untuk mixed devices seperti Surface atau touchscreen laptops.
 */
export function useIsTouch(): boolean {
  return useMediaQuery(QUERIES.touch);
}

/**
 * Deteksi breakpoint saat ini.
 * Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
 *
 * @example
 * const breakpoint = useBreakpoint();
 * // 'lg' saat viewport >= 768px dan < 1024px
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg'); // Default untuk SSR

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;

      if (width < 420) setBreakpoint('xs');
      else if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else if (width < 1400) setBreakpoint('2xl');
      else setBreakpoint('3xl');
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Helper untuk cek breakpoint lebih besar atau sama dengan target.
 * @param target - breakpoint target ('sm', 'md', 'lg', dll)
 *
 * @example
 * const isMdOrUp = useMinBreakpoint('md'); // true jika >= 640px
 */
export function useMinBreakpoint(target: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'): boolean {
  const minWidths: Record<typeof target, string> = {
    xs: '(min-width: 0px)',
    sm: '(min-width: 420px)',
    md: '(min-width: 640px)',
    lg: '(min-width: 768px)',
    xl: '(min-width: 1024px)',
    '2xl': '(min-width: 1280px)',
    '3xl': '(min-width: 1400px)',
  };

  return useMediaQuery(minWidths[target]);
}

/**
 * Helper untuk cek breakpoint lebih kecil atau sama dengan target.
 * @param target - breakpoint target ('xs', 'sm', 'md', dll)
 *
 * @example
 * const isSmOrDown = useMaxBreakpoint('sm'); // true jika <= 639px
 */
export function useMaxBreakpoint(target: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'): boolean {
  const maxWidths: Record<typeof target, string> = {
    xs: '(max-width: 419px)',
    sm: '(max-width: 639px)',
    md: '(max-width: 767px)',
    lg: '(max-width: 1023px)',
    xl: '(max-width: 1279px)',
    '2xl': '(max-width: 1399px)',
  };

  return useMediaQuery(maxWidths[target]);
}

/**
 * Hook untuk viewport dimensions.
 * Returns { width, height } yang diupdate saat resize.
 *
 * @example
 * const { width, height } = useViewport();
 * if (width < 640) return <MobileLayout />;
 */
export function useViewport(): { width: number; height: number } {
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return viewport;
}

// Export query constants untuk penggunaan di luar hook
export { QUERIES };
