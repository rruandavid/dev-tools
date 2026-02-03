/**
 * Gera ícones PWA (PNG) a partir de favicon.svg
 * Uso: node scripts/generate-pwa-icons.js
 * Requer: npm install sharp
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const rootDir = path.join(__dirname, '..');
const svgPath = path.join(rootDir, 'favicon.svg');
const outDir = path.join(rootDir, 'icons');

if (!fs.existsSync(svgPath)) {
  console.error('favicon.svg não encontrado na raiz do projeto.');
  process.exit(1);
}

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Instale sharp: npm install sharp');
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const svgBuffer = fs.readFileSync(svgPath);

Promise.all(
  sizes.map((size) =>
    sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`))
      .then(() => console.log(`Gerado: icon-${size}x${size}.png`))
  )
).then(() => {
  console.log('Ícones PWA gerados em /icons/');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
