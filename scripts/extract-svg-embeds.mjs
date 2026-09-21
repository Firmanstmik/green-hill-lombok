import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('src/assets/greenhill/Logo Green Hill Lombok.svg', 'utf8');
const matches = [...svg.matchAll(/xlink:href="data:image\/(png|jpeg);base64,([^"]+)"/g)];
console.log('embedded images', matches.length);

for (let i = 0; i < matches.length; i++) {
  const [, type, b64] = matches[i];
  const buf = Buffer.from(b64, 'base64');
  const out = `src/assets/greenhill/brand/_svg-embed-${i}.${type === 'jpeg' ? 'jpg' : 'png'}`;
  fs.writeFileSync(out, buf);
  const meta = await sharp(buf).metadata();
  console.log(i, type, meta.width, meta.height, out);
}
