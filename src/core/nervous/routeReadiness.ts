export type RouteReadiness = 'canonical' | 'redirect-only' | 'dev-only';

export type ProductRouteMeta = {
  href: string;
  label: string;
  readiness: RouteReadiness;
  nav: 'primary' | 'secondary' | 'hidden';
};

const PRODUCT_ROUTE_META: ProductRouteMeta[] = [
  { href: '/today', label: 'Board', readiness: 'canonical', nav: 'primary' },
  { href: '/slip', label: 'Slip', readiness: 'canonical', nav: 'primary' },
  { href: '/stress-test', label: 'Analyze', readiness: 'canonical', nav: 'primary' },
  { href: '/track', label: 'Track', readiness: 'canonical', nav: 'primary' },
  { href: '/review', label: 'Review', readiness: 'canonical', nav: 'primary' },
  { href: '/control', label: 'Control Room', readiness: 'dev-only', nav: 'hidden' },
  { href: '/discover', label: 'Discover', readiness: 'dev-only', nav: 'hidden' },
  { href: '/ingest', label: 'Ingest', readiness: 'dev-only', nav: 'hidden' },
  { href: '/research', label: 'Research', readiness: 'redirect-only', nav: 'hidden' },
  { href: '/pending-bets', label: 'Pending bets', readiness: 'dev-only', nav: 'hidden' },
  { href: '/live', label: 'Live', readiness: 'redirect-only', nav: 'hidden' },
  { href: '/settings', label: 'Settings', readiness: 'dev-only', nav: 'hidden' },
  { href: '/u', label: 'Profile', readiness: 'dev-only', nav: 'hidden' },
  { href: '/dev', label: 'Dev', readiness: 'dev-only', nav: 'hidden' }
];

export function listProductRoutes(): ProductRouteMeta[] {
  return PRODUCT_ROUTE_META;
}

export function listPrimaryCanonicalRoutes(): ProductRouteMeta[] {
  return PRODUCT_ROUTE_META.filter((route) => route.nav === 'primary' && route.readiness === 'canonical');
}

export function listProductRoutePrefixes(): string[] {
  return PRODUCT_ROUTE_META.map((route) => route.href);
}

export function routeReadinessLabel(readiness: RouteReadiness): string {
  if (readiness === 'canonical') return 'Canonical';
  if (readiness === 'redirect-only') return 'Redirect-only';
  return 'Dev-only';
}
