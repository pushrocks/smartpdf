import { expect, tap } from '@pushrocks/tapbundle';
import * as smartpdf from '../ts/index';

let testSmartPdf: smartpdf.SmartPdf;

tap.test('should create a valid instance of smartpdf', async () => {
  testSmartPdf = new smartpdf.SmartPdf();
  expect(testSmartPdf).to.be.instanceof(smartpdf.SmartPdf);
});

tap.test('should create a pdf from html string', async () => {
  await testSmartPdf.getPdfForHtmlString('hi');
});

tap.test('should create a pdf from website', async () => {
  await testSmartPdf.getPdfForWebsite('https://wikipedia.org');
});

tap.test('should be able to close properly', async () => {
  await testSmartPdf.close();
});

tap.start();
