// Auto-derive brand color from the logo and set CSS vars used by brand.css
export default function initBrandFromLogo(logoUrl) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    img.onload = () => {
      const w = 64, h = 64;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);

      let rSum = 0, gSum = 0, bSum = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 200) continue;                      // ignore transparent pixels
        if (r > 240 && g > 240 && b > 240) continue; // ignore near-white bg
        rSum += r; gSum += g; bSum += b; n++;
      }
      let r = 31, g = 63, b = 183; // fallback
      if (n > 10) { r = Math.round(rSum/n); g = Math.round(gSum/n); b = Math.round(bSum/n); }

      const toHex = (v) => v.toString(16).padStart(2, '0');
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

      // choose readable ink color
      const relLum = (ch) => {
        ch /= 255;
        return ch <= 0.03928 ? ch/12.92 : Math.pow((ch+0.055)/1.055, 2.4);
      };
      const L = 0.2126*relLum(r) + 0.7152*relLum(g) + 0.0722*relLum(b);
      const ink = (1.05/(L+0.05) > (L+0.05)/0.05) ? '#ffffff' : '#111827';

      // light tint
      const mix = (c1, c2, t) => Math.round(c1*(1-t) + c2*t);
      const tint = `#${toHex(mix(r,255,0.85))}${toHex(mix(g,255,0.85))}${toHex(mix(b,255,0.85))}`;

      const root = document.documentElement.style;
      root.setProperty('--brand-primary', hex);
      root.setProperty('--brand-primary-ink', ink);
      root.setProperty('--brand-primary-10', tint);
    };
  } catch (_) {
    // no-op
  }
}
