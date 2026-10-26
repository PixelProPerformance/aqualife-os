// Preserve the existing production default; isolated environments set APP_BASE_URL.
export function appUrl(pathname, base = process.env.APP_BASE_URL || 'https://app.aqualifeaquarismo.com') {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('APP_BASE_URL deve ser uma URL HTTP(S) sem credenciais');
  }
  return new URL(pathname, url.origin).href;
}
