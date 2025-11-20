import sharp from 'sharp';
import fs from 'fs';

//Extraction d'un dégradé linéaire sur l'image de fond 
export async function computeBackgroundGradientFromImage(absoluteImagePath) {
    if (!absoluteImagePath || typeof absoluteImagePath !== 'string') {
    return 'white';
  }

  try {
    await fs.promises.access(absoluteImagePath, fs.constants.R_OK);
  } catch {
    return 'white';
  }

  try {
    const size = 16;
    const { data } = await sharp(absoluteImagePath)
      .resize(size, size, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 3; // RGB only
    for (let i = 0; i < data.length; i += 3) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);

    const primary = `rgba(${r}, ${g}, ${b}, 0.6)`;
    const secondary = `rgba(${Math.max(r - 40, 0)}, ${Math.max(g - 40, 0)}, ${Math.max(b - 40, 0)}, 0.9)`;
    return `linear-gradient(135deg, ${primary}, ${secondary})`;
  } catch (e) {
    console.error('Error computing background gradient:', e);
    return 'white';
  }
}