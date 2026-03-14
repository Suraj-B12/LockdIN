/**
 * cropTransparent — Shared utility for LockdIN
 * Loads a PNG, finds the tight bounding box of non-transparent pixels,
 * and returns a cropped data URL containing only the visible content.
 *
 * Usage: cropTransparent('path/to/image.png').then(dataUrl => img.src = dataUrl)
 */
window.cropTransparent = function cropTransparent(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

            let top = height, bottom = 0, left = width, right = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (data[(y * width + x) * 4 + 3] > 10) {
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                        if (x < left) left = x;
                        if (x > right) right = x;
                    }
                }
            }

            if (top > bottom || left > right) {
                return resolve(src); // Fully transparent — return original
            }

            const cw = right - left + 1;
            const ch = bottom - top + 1;
            const out = document.createElement('canvas');
            out.width = cw;
            out.height = ch;
            out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
            resolve(out.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = src;
    });
};
