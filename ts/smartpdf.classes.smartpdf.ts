import * as plugins from './smartpdf.plugins';
import * as paths from './smartpdf.paths';
import { Server } from 'http';
import { PdfCandidate } from './smartpdf.classes.pdfcandidate';

declare const document;

import * as interfaces from './interfaces';

export class SmartPdf {
  htmlServerInstance: Server;
  serverPort: number;
  headlessBrowser: plugins.smartpuppeteer.puppeteer.Browser;
  externalBrowserBool: boolean = false;
  private _readyDeferred: plugins.smartpromise.Deferred<void>;
  private _candidates: { [key: string]: PdfCandidate } = {};

  constructor() {
    this._readyDeferred = new plugins.smartpromise.Deferred();
  }

  async start(headlessBrowserArg?) {
    // lets set the external browser in case one is provided
    this.headlessBrowser = headlessBrowserArg;
    // setup puppeteer
    if (this.headlessBrowser) {
      this.externalBrowserBool = true;
    } else {
      this.headlessBrowser = await plugins.smartpuppeteer.getEnvAwareBrowserInstance({
        forceNoSandbox: true,
      });
    }

    // setup server
    const app = plugins.express();
    app.get('/:pdfId', (req, res) => {
      res.setHeader('PDF-ID', this._candidates[req.params.pdfId].pdfId);
      res.send(this._candidates[req.params.pdfId].htmlString);
    });
    this.htmlServerInstance = plugins.http.createServer(app);
    const smartnetworkInstance = new plugins.smartnetwork.SmartNetwork();
    const portAvailable = smartnetworkInstance.isLocalPortUnused(3210);
    this.htmlServerInstance.listen(3210, 'localhost');
    this.htmlServerInstance.on('listening', () => {
      this._readyDeferred.resolve();
    });
  }

  // stop
  async stop() {
    const done = plugins.smartpromise.defer<void>();
    this.htmlServerInstance.close(() => {
      done.resolve();
    });

    if (!this.externalBrowserBool) {
      await this.headlessBrowser.close();
    }

    await done.promise;
  }

  /**
   * returns a pdf for a given html string;
   */
  async getPdfResultForHtmlString(htmlStringArg: string): Promise<interfaces.IPdfResult> {
    await this._readyDeferred.promise;
    const pdfCandidate = new PdfCandidate(htmlStringArg);
    this._candidates[pdfCandidate.pdfId] = pdfCandidate;
    const page = await this.headlessBrowser.newPage();
    const response = await page.goto(`http://localhost:3210/${pdfCandidate.pdfId}`, {
      waitUntil: 'networkidle2',
    });
    const headers = response.headers();
    if (headers['pdf-id'] !== pdfCandidate.pdfId) {
      console.log('Error! Headers do not match. For security reasons no pdf is being emitted!');
      return;
    } else {
      console.log(`id security check passed for ${pdfCandidate.pdfId}`);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    await page.close();
    delete this._candidates[pdfCandidate.pdfId];
    pdfCandidate.doneDeferred.resolve();
    await pdfCandidate.doneDeferred.promise;
    return {
      id: pdfCandidate.pdfId,
      name: `${pdfCandidate.pdfId}.js`,
      buffer: pdfBuffer,
    };
  }

  async getPdfResultForWebsite(websiteUrl: string): Promise<interfaces.IPdfResult> {
    const page = await this.headlessBrowser.newPage();
    await page.emulateMediaType('screen');
    const response = await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    const pdfId = plugins.smartunique.shortId();
    const { documentHeight, documentWidth } = await page.evaluate(() => {
      return {
        documentHeight: document.height,
        documentWidth: document.width,
      };
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      height: documentWidth,
      width: documentWidth,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    await page.close();
    return {
      id: pdfId,
      name: `${pdfId}.js`,
      buffer: pdfBuffer,
    };
  }

  async getFullWebsiteAsSinglePdf(websiteUrl: string) {
    const page = await this.headlessBrowser.newPage();
    page.emulateMediaType('screen');
    const response = await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    const pdfId = plugins.smartunique.shortId();
    const { documentHeight, documentWidth } = await page.evaluate(() => {
      return {
        documentHeight: document.height,
        documentWidth: document.width,
      };
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      height: documentWidth,
      width: documentWidth,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    await page.close();
    return {
      id: pdfId,
      name: `${pdfId}.js`,
      buffer: pdfBuffer,
    };
  }
}
