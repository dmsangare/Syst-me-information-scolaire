import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';

export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Genere un PDF a partir d'un contenu HTML.
   * Utilise Playwright (compatible Zod 4, pas de chromium-bidi).
   */
  async generateFromHtml(html: string, options: PdfOptions = {}): Promise<Buffer> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page: Page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });

      const pdfBuffer = await page.pdf({
        format: options.format ?? 'A4',
        landscape: options.landscape ?? false,
        margin: options.margin ?? {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: options.printBackground ?? true,
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Erreur generation PDF : ${(error as Error).message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Genere un PDF a partir d'une URL.
   */
  async generateFromUrl(url: string, options: PdfOptions = {}): Promise<Buffer> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page: Page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      const pdfBuffer = await page.pdf({
        format: options.format ?? 'A4',
        landscape: options.landscape ?? false,
        margin: options.margin ?? {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: options.printBackground ?? true,
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Erreur generation PDF depuis URL : ${(error as Error).message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}