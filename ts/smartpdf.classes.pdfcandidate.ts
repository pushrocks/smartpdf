import * as plugins from './smartpdf.plugins';

export class PdfCandidate {
  pdfId = plugins.smartunique.shortId();
  doneDeferred = plugins.smartpromise.defer();

  constructor(public htmlString) {}
}
