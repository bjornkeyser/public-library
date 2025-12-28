import { pdf } from "pdf-to-img";
import Tesseract from "tesseract.js";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

export interface PageResult {
  pageNumber: number;
  imagePath: string;
  text: string;
  isSpreadHalf?: "left" | "right";
}

export interface ProcessingResult {
  magazineId: number;
  pdfPath: string;
  pages: PageResult[];
  totalPages: number;
  pdfPages: number;
}

// Aspect ratio threshold: if width/height > this, it's a spread
const SPREAD_THRESHOLD = 1.2;

/**
 * Check if an image is a spread (two pages side by side)
 */
async function isSpread(imageBuffer: Buffer): Promise<{ isSpread: boolean; width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const aspectRatio = width / height;

  return {
    isSpread: aspectRatio > SPREAD_THRESHOLD,
    width,
    height,
  };
}

/**
 * Split a spread image into left and right halves
 */
async function splitSpread(imageBuffer: Buffer, width: number, height: number): Promise<{ left: Buffer; right: Buffer }> {
  const halfWidth = Math.floor(width / 2);

  const left = await sharp(imageBuffer)
    .extract({ left: 0, top: 0, width: halfWidth, height })
    .toBuffer();

  const right = await sharp(imageBuffer)
    .extract({ left: halfWidth, top: 0, width: width - halfWidth, height })
    .toBuffer();

  return { left, right };
}

/**
 * Process a PDF file: convert pages to images, detect spreads, split them, and run OCR
 */
export async function processPdf(
  pdfPath: string,
  magazineId: number,
  options: {
    outputDir?: string;
    onProgress?: (page: number, total: number, status: string) => void;
  } = {}
): Promise<ProcessingResult> {
  const { outputDir = "public/pages", onProgress } = options;

  // Ensure output directory exists
  const magazineDir = path.join(process.cwd(), outputDir, String(magazineId));
  if (!fs.existsSync(magazineDir)) {
    fs.mkdirSync(magazineDir, { recursive: true });
  }

  const absolutePdfPath = pdfPath.startsWith("/")
    ? path.join(process.cwd(), "public", pdfPath)
    : pdfPath;

  console.log(`Processing PDF: ${absolutePdfPath}`);

  // Convert PDF to images
  const document = await pdf(absolutePdfPath, { scale: 1.5 }); // 1.5 for faster OCR

  const pages: PageResult[] = [];
  let pdfPageNumber = 0;
  let logicalPageNumber = 0;
  const pdfPages = document.length;

  console.log(`PDF has ${pdfPages} pages`);

  // Initialize Tesseract worker
  const worker = await Tesseract.createWorker("eng");

  try {
    for await (const image of document) {
      pdfPageNumber++;
      const imageBuffer = Buffer.from(image);

      // Check if this is a spread
      const spreadCheck = await isSpread(imageBuffer);

      if (spreadCheck.isSpread) {
        console.log(`PDF page ${pdfPageNumber}/${pdfPages} is a SPREAD (${spreadCheck.width}x${spreadCheck.height})`);

        // Split into left and right
        const { left, right } = await splitSpread(imageBuffer, spreadCheck.width, spreadCheck.height);

        // Process LEFT half
        logicalPageNumber++;
        onProgress?.(logicalPageNumber, pdfPages * 2, "Processing spread (left)");
        console.log(`  Processing left half as page ${logicalPageNumber}...`);

        const leftImageName = `page-${String(logicalPageNumber).padStart(3, "0")}.png`;
        const leftImagePath = path.join(magazineDir, leftImageName);
        fs.writeFileSync(leftImagePath, left);

        const leftOcr = await worker.recognize(left);
        console.log(`    Extracted ${leftOcr.data.text.length} characters`);

        pages.push({
          pageNumber: logicalPageNumber,
          imagePath: `/pages/${magazineId}/${leftImageName}`,
          text: leftOcr.data.text.trim(),
          isSpreadHalf: "left",
        });

        // Process RIGHT half
        logicalPageNumber++;
        onProgress?.(logicalPageNumber, pdfPages * 2, "Processing spread (right)");
        console.log(`  Processing right half as page ${logicalPageNumber}...`);

        const rightImageName = `page-${String(logicalPageNumber).padStart(3, "0")}.png`;
        const rightImagePath = path.join(magazineDir, rightImageName);
        fs.writeFileSync(rightImagePath, right);

        const rightOcr = await worker.recognize(right);
        console.log(`    Extracted ${rightOcr.data.text.length} characters`);

        pages.push({
          pageNumber: logicalPageNumber,
          imagePath: `/pages/${magazineId}/${rightImageName}`,
          text: rightOcr.data.text.trim(),
          isSpreadHalf: "right",
        });

      } else {
        // Single page
        logicalPageNumber++;
        onProgress?.(logicalPageNumber, pdfPages, "Converting page to image");
        console.log(`PDF page ${pdfPageNumber}/${pdfPages} is SINGLE → page ${logicalPageNumber}`);

        const imageName = `page-${String(logicalPageNumber).padStart(3, "0")}.png`;
        const imagePath = path.join(magazineDir, imageName);
        fs.writeFileSync(imagePath, imageBuffer);

        // Run OCR
        onProgress?.(logicalPageNumber, pdfPages, "Running OCR");
        console.log(`  Running OCR...`);

        const { data } = await worker.recognize(imageBuffer);
        const text = data.text.trim();

        console.log(`  Extracted ${text.length} characters`);

        pages.push({
          pageNumber: logicalPageNumber,
          imagePath: `/pages/${magazineId}/${imageName}`,
          text,
        });
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    magazineId,
    pdfPath,
    pages,
    totalPages: logicalPageNumber,
    pdfPages,
  };
}

/**
 * Process a single page (useful for testing)
 */
export async function processPage(
  imagePath: string
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker("eng");

  try {
    const { data } = await worker.recognize(imagePath);
    return {
      text: data.text.trim(),
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
