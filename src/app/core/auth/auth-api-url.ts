/** Build auth API URLs whether apiUrl is `http://host/api` or `http://host:5080`. */
export function authApiUrl(apiUrl: string, path: string): string {
  const base = apiUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api')) {
    return `${base}${suffix}`;
  }
  return `${base}/api${suffix}`;
}
