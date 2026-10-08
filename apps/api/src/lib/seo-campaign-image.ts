import sharp from "sharp";

export async function processSeoCampaignImage(source: Buffer) {
  if (!source.length || source.length > 15_000_000)
    throw new Error("Image exceeds the processing size limit");
  const output = await sharp(source, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const metadata = await sharp(output).metadata();
  if (metadata.format !== "webp" || metadata.exif || metadata.iptc || metadata.xmp)
    throw new Error("Processed image metadata validation failed");
  return output;
}
