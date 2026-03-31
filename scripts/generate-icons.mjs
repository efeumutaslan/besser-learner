import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// BesserLernen SVG icon - "BL" text on indigo gradient
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#4F46E5"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="340" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="260" fill="white" text-anchor="middle">BL</text>
</svg>`;

// Favicon SVG (simpler, smaller)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#6366F1"/>
  <text x="16" y="23" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="white" text-anchor="middle">BL</text>
</svg>`;

writeFileSync(join(publicDir, "icon.svg"), svgIcon);
writeFileSync(join(publicDir, "favicon.svg"), faviconSvg);

console.log("SVG icons created. Now generating PNGs...");

// Try sharp for PNG conversion
try {
  const sharp = (await import("sharp")).default;

  const sizes = [
    { name: "favicon.ico", size: 32 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
  ];

  for (const { name, size } of sizes) {
    const buf = Buffer.from(svgIcon);
    if (name.endsWith(".ico")) {
      await sharp(buf).resize(size, size).png().toFile(join(publicDir, "favicon.png"));
      // Also create as .ico (browsers accept PNG as favicon)
      await sharp(buf).resize(size, size).png().toFile(join(publicDir, name));
    } else {
      await sharp(buf).resize(size, size).png().toFile(join(publicDir, name));
    }
    console.log(`Created ${name} (${size}x${size})`);
  }
  console.log("All icons generated!");
} catch (e) {
  console.log("sharp not found, installing...");
  throw e;
}
