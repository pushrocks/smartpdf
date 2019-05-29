import * as plugins from './smartpdf.plugins';
import * as paths from './smartpdf.paths';
import { Server } from 'http';
import { PdfCandidate } from './smartpdf.classes.pdfcandidate';

declare const document;

export class SmartPdf {
  htmlServerInstance: Server;
  serverPort: number;
  headlessBrowser: plugins.puppeteer.Browser;
  private _readyDeferred: plugins.smartpromise.Deferred<void>;
  private _candidates: { [key: string]: PdfCandidate } = {};

  constructor() {
    this._readyDeferred = new plugins.smartpromise.Deferred();
  }

  async start() {
    // setup puppeteer
    this.headlessBrowser = await plugins.puppeteer.launch();

    // setup server
    const app = plugins.express();
    app.get('/:pdfId', (req, res) => {
      res.setHeader('PDF-ID', this._candidates[req.params.pdfId].pdfId);
      res.send(this._candidates[req.params.pdfId].htmlString);
    });
    this.htmlServerInstance = plugins.http.createServer(app);
    const smartnetworkInstance = new plugins.smartnetwork.SmartNetwork();
    const portAvailable = smartnetworkInstance.isLocalPortAvailable(3210);
    this.htmlServerInstance.listen(3210, 'localhost');
    this.htmlServerInstance.on('listening', () => {
      this._readyDeferred.resolve();
    });
  }

  async stop() {
    const done = plugins.smartpromise.defer<void>();
    this.htmlServerInstance.close(() => {
      done.resolve();
    });
    await this.headlessBrowser.close();
    await done.promise;
  }

  /**
   * returns a pdf for a given html string;
   */
  async getPdfForHtmlString(htmlStringArg: string) {
    await this._readyDeferred.promise;
    const pdfCandidate = new PdfCandidate(htmlStringArg);
    this._candidates[pdfCandidate.pdfId] = pdfCandidate;
    const page = await this.headlessBrowser.newPage();
    const response = await page.goto(`http://localhost:3210/${pdfCandidate.pdfId}`, {
      waitUntil: 'networkidle2'
    });
    const headers = response.headers();
    if (headers['pdf-id'] !== pdfCandidate.pdfId) {
      console.log('Error! Headers do not match. For security reasons no pdf is being emitted!');
      return;
    } else {
      console.log(`id security check passed for ${pdfCandidate.pdfId}`);
    }

    await page.pdf({
      path: plugins.path.join(paths.pdfDir, `${pdfCandidate.pdfId}.pdf`),
      format: 'A4'
    });
    await page.close();
    delete this._candidates[pdfCandidate.pdfId];
    pdfCandidate.doneDeferred.resolve();
    await pdfCandidate.doneDeferred.promise;
  }

  async getPdfForWebsite(websiteUrl: string) {
    const page = await this.headlessBrowser.newPage();
    page.emulateMedia('screen');
    const response = await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    const pdfId = plugins.smartunique.shortId();
    await page.pdf({
      path: plugins.path.join(paths.pdfDir, `${pdfId}.pdf`),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    await page.close();
  }

  async getFullWebsiteAsSinglePdf(websiteUrl: string) {
    const page = await this.headlessBrowser.newPage();
    page.emulateMedia('screen');
    const response = await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    const pdfId = plugins.smartunique.shortId();
    const {documentHeight, documentWidth} = await page.evaluate(() => {
      
      return {
        documentHeight: document.height,
        documentWidth: document.width
      };
    });
    await page.pdf({
      path: plugins.path.join(paths.pdfDir, `${pdfId}.pdf`),
      height: documentWidth,
      width: documentWidth,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    await page.close();
  }
}
