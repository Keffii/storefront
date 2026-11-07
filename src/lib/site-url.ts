/**
 * The public base URL, used for canonical links, the sitemap, JSON-LD and
 * Open Graph images. Set SITE_URL in the hosting environment.
 */
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const absoluteUrl = (path: string) => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
