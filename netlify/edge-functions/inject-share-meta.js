import {
  buildOgImageQuery,
  buildShareDescription,
  resolveShareContext,
} from "../functions/share-meta-lib.mjs";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function replaceMetaContent(html, selectorPattern, content) {
  const pattern = new RegExp(
    `(${selectorPattern} content=")[^"]*(")`,
    "i",
  );
  return html.replace(pattern, `$1${escapeAttr(content)}$2`);
}

export default async (request, context) => {
  const url = new URL(request.url);
  const paletteParam = url.searchParams.get("palette");
  const hasShareParams =
    url.searchParams.has("colors") ||
    (paletteParam && paletteParam !== "all");

  if (!hasShareParams) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  const shareContext = resolveShareContext(url.searchParams);
  const description = buildShareDescription(shareContext);
  const ogQuery = buildOgImageQuery(shareContext);
  const imageUrl = ogQuery ? `${url.origin}/og?${ogQuery}` : `${url.origin}/og`;
  const pageUrl = url.href;

  let html = await response.text();
  html = replaceMetaContent(html, 'meta name="description"', description);
  html = replaceMetaContent(html, 'meta property="og:description"', description);
  html = replaceMetaContent(html, 'meta property="og:image"', imageUrl);
  html = replaceMetaContent(html, 'meta property="og:url"', pageUrl);
  html = replaceMetaContent(html, 'meta name="twitter:description"', description);
  html = replaceMetaContent(html, 'meta name="twitter:image"', imageUrl);
  html = replaceMetaContent(html, 'meta name="twitter:image:alt"', description);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const config = {
  path: "/",
};
