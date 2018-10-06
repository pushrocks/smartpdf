import * as plugins from './smartpdf.plugins';

export const packageDir = plugins.path.join(__dirname, '../');
export const pdfDir = plugins.path.join(packageDir, 'assets/pdfdir');

plugins.smartfile.fs.ensureDirSync(pdfDir);
