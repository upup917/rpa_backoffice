function normalizeBasePath(raw: string | undefined): string {
  if (!raw) return '';
  let bp = String(raw).trim();
  if (!bp || bp === '/') return '';

  // Allow passing a full URL (we only use the pathname part).
  if (bp.startsWith('http://') || bp.startsWith('https://')) {
    try {
      bp = new URL(bp).pathname || '';
    } catch {
      // Fall through and treat as a path.
    }
  }

  if (!bp.startsWith('/')) bp = `/${bp}`;
  // Remove trailing slash to avoid double-slash joins.
  if (bp.endsWith('/')) bp = bp.slice(0, -1);
  return bp;
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(path: string): string {
  // Leave absolute URLs untouched.
  if (/^https?:\/\//i.test(path)) return path;

  const bp = BASE_PATH;
  if (!bp) return path;

  if (!path.startsWith('/')) path = `/${path}`;

  // Prevent accidental double-prefixing.
  if (path === bp || path.startsWith(`${bp}/`)) return path;
  return `${bp}${path}`;
}

// Alias for readability at call sites.
export function apiUrl(path: string): string {
  return withBasePath(path);
}

