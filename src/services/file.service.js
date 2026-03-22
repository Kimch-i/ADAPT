import PDFParser from 'pdf2json';

export async function extractTextFromPdfBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, true);

        parser.on('pdfParser_dataReady', () => {
            try {
                const text = decodeURIComponent(parser.getRawTextContent());
                resolve(text);
            } catch (err) {
                reject(err);
            }
        });

        parser.on('pdfParser_dataError', err => {
            reject(err);
        });

        parser.parseBuffer(buffer);
    });
}
