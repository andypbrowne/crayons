import { resolveShareContext } from "./share-meta-lib.mjs";

const CRAYON_WRAPPER = "#E4E4E4";
const CRAYON_INK = "#333333";
const CRAYON_DETAIL =
  "M248 0h21c9 24 14 37.5 18.5 61.5 0 20.797-6.44 36.353-12.271 50.437C270.406 123.587 266 134.23 266 146c0 12.759 4.696 26.602 9.479 40.701 4.964 14.632 10.021 29.54 10.021 43.799 0 14-4.5 27.375-9 40.75s-9 26.75-9 40.75c0 14.327 5.237 30.749 10.351 46.787 4.88 15.305 9.649 30.261 9.649 42.713 0 12.077-3.589 18.21-7.367 24.667-4.2 7.176-8.633 14.752-8.633 31.333V491h19v-33.5c0-14.627 3.434-21.622 6.839-28.556 3.345-6.813 6.661-13.567 6.661-27.444 0-14.259-4.798-30.464-9.507-46.368-4.538-15.326-8.993-30.373-8.993-43.132 0-12.759 4.576-25.88 9.236-39.243 4.836-13.868 9.764-27.998 9.764-42.257 0-14.327-4.975-29.44-9.833-44.199-4.636-14.086-9.167-27.849-9.167-40.301 0-10.655 3.666-18.516 7.935-27.67 5.948-12.753 13.065-28.013 13.065-56.83C301.5 33 295 10 290.5 0H324v625h-34v-25h-19v25h-23V0ZM970 0h21c9 24 14 37.5 18.5 61.5 0 20.797-6.44 36.353-12.271 50.437C992.406 123.587 988 134.23 988 146c0 12.759 4.696 26.602 9.479 40.701 4.961 14.632 10.021 29.54 10.021 43.799 0 14-4.5 27.375-9 40.75s-9 26.75-9 40.75c0 14.327 5.237 30.749 10.351 46.787 4.879 15.305 9.649 30.261 9.649 42.713 0 12.077-3.59 18.21-7.37 24.667-4.197 7.176-8.63 14.752-8.63 31.333V491h19v-33.5c0-14.627 3.43-21.622 6.84-28.556 3.34-6.813 6.66-13.567 6.66-27.444 0-14.259-4.8-30.464-9.51-46.368-4.53-15.326-8.99-30.373-8.99-43.132 0-12.759 4.58-25.88 9.24-39.243 4.83-13.868 9.76-27.998 9.76-42.257 0-14.327-4.97-29.44-9.83-44.199-4.64-14.086-9.17-27.849-9.17-40.301 0-10.655 3.67-18.516 7.94-27.67 5.94-12.753 13.06-28.013 13.06-56.83-5-28.5-11.5-51.5-16-61.5h33.5v625h-34v-25h-19v25h-23V0Z";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderCrayon(color, x, y, scale) {
  const wrapperPath = "M186 0h922v121H186z";
  const tipPath =
    "M1108 1h60a4 4 0 0 1 4 4v114a4 4 0 0 1-4 4h-60V1ZM186 0h-59.5a4 4 0 0 0-4 4v13.16a4 4 0 0 1-3.384 3.951L3.384 39.136A4 4 0 0 0 0 43.089v31.89a4 4 0 0 0 3.29 3.936l115.92 20.904a4 4 0 0 1 3.29 3.937V118a4 4 0 0 0 4 4H186V0Z";
  const labelPath =
    "M935.486 137.5c2.986-61-128.403-60.834-216-61.5-90.044-.685-220.563-4.472-222.5 61.5-2.011 68.5 132.494 70.681 222.5 70 87.558-.662 213.014-9 216-70Z";

  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <path fill="${CRAYON_WRAPPER}" d="${wrapperPath}"/>
      <path fill="${CRAYON_INK}" fill-rule="evenodd" clip-rule="evenodd" d="${CRAYON_DETAIL}"/>
      <path fill="${CRAYON_INK}" d="${labelPath}"/>
      <path fill="${color}" d="${tipPath}"/>
    </g>
  `;
}

function buildOgSvg(context) {
  const colors = context.colors.slice(0, 5);
  const crayonCount = Math.max(colors.length, 1);
  const scale = 0.19;
  const crayonWidth = 1172 * scale;
  const gap = 24;
  const totalWidth = crayonCount * crayonWidth + (crayonCount - 1) * gap;
  const startX = (1200 - totalWidth) / 2;
  const crayonY = 300;

  const crayons = colors
    .map((color, index) =>
      renderCrayon(color, startX + index * (crayonWidth + gap), crayonY, scale),
    )
    .join("");

  const subtitle = escapeXml(context.label);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Crayons palette preview">
  <rect width="1200" height="630" fill="#F7F7F7"/>
  <text x="600" y="130" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="84" font-weight="700" fill="#1A1A1A">Crayons</text>
  <text x="600" y="195" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="34" fill="#666666">${subtitle}</text>
  ${crayons}
</svg>`;
}

export default async (request) => {
  const url = new URL(request.url);
  const context = resolveShareContext(url.searchParams);
  const svg = buildOgSvg(context);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
