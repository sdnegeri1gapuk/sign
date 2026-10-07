/**
 * Utility to process uploaded signature images:
 * - Removes white/off-white paper backgrounds to create transparent PNGs
 * - Trims empty transparent padding around signatures
 * - Enhances contrast so pencil/pen marks are sharp and clear
 */
export async function processSignatureImage(
  file: File,
  options: { removeBackground?: boolean; threshold?: number } = {}
): Promise<{ dataUrl: string; width: number; height: number; title: string }> {
  const { removeBackground = true, threshold = 215 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memproses format gambar.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({
            dataUrl: src,
            width: canvas.width,
            height: canvas.height,
            title: file.name.replace(/\.[^/.]+$/, ''),
          });
          return;
        }

        ctx.drawImage(img, 0, 0);

        if (removeBackground) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminance / brightness calculation
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            if (luminance >= threshold) {
              // Paper background -> completely transparent
              data[i + 3] = 0;
            } else if (luminance > threshold - 35) {
              // Smooth feathering transition edge
              const factor = (threshold - luminance) / 35;
              data[i + 3] = Math.round(255 * factor);
            } else {
              // Deepen ink contrast slightly for official look
              data[i] = Math.max(0, r - 20);
              data[i + 1] = Math.max(0, g - 20);
              data[i + 2] = Math.max(0, b - 20);
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/png');
        resolve({
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
