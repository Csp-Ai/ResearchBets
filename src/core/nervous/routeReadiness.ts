export type RouteReadiness = 'canonical' | 'secondary' | 'internal';

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
  { href: '/control', label: 'Control Room', readiness: 'secondary', nav: 'secondary' },
  { href: '/discover', label: 'Discover', readiness: 'secondary', nav: 'secondary' },
  { href: '/ingest', label: 'Ingest', readiness: 'secondary', nav: 'secondary' },
  { href: '/research', label: 'Research', readiness: 'secondary', nav: 'hidden' },
  { href: '/pending-bets', label: 'Pending bets', readiness: 'secondary', nav: 'hidden' },
  { href: '/live', label: 'Live', readiness: 'secondary', nav: 'hidden' },
  { href: '/settings', label: 'Settings', readiness: 'internal', nav: 'hidden' },
  { href: '/u', label: 'Profile', readiness: 'internal', nav: 'hidden' },
  { href: '/dev', label: 'Dev', readiness: 'internal', nav: 'hidden' }
];

export function listProductRoutes(): ProductRouteMeta[] {
  return PRODUCT_ROUTE_META;
}

export function listPrimaryCanonicalRoutes(): ProductRouteMeta[] {
  return PRODUCT_ROUTE_META.filter((route) => route.nav === 'primary' && route.readiness === 'canonical');
}

export function listSecondaryRoutes(): ProductRouteMeta[] {
  return PRODUCT_ROUTE_META.filter((route) => route.nav === 'secondary');
}

export function listProductRoutePrefixes(): string[] {
  return PRODUCT_ROUTE_META.map((route) => route.href);
}

export function routeReadinessLabel(readiness: RouteReadiness): string {
  if (readiness === 'canonical') return 'Canonical';
  if (readiness === 'secondary') return 'Secondary';
  return 'Internal';
}
