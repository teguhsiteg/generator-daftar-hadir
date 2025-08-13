// 1. Import library yang dibutuhkan
const express = require('express');
const puppeteer = require('puppeteer');

// 2. Inisialisasi aplikasi Express
const app = express();
const port = 3000;

// 3. Konfigurasi Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// 4. Fungsi untuk Membuat Template HTML PDF (VERSI DIPERBARUI & DIPERBAIKI)
function createPdfHtml(data) {
    const { 
        logoLeft, logoRight, logoSizeLeft, logoSizeRight, headers, 
        participantColumns, columnFormats, participants, signatureDate,
        signaturesLeft, signaturesCenter, signaturesRight 
    } = data;
    const sizeLeft = logoSizeLeft || '80';
    const sizeRight = logoSizeRight || '80';

    const headerRows = headers.map(h => `
        <tr>
            <td style="width: 150px; vertical-align: top;">${h.key}</td>
            <td style="vertical-align: top;">: ${h.value}</td>
        </tr>
    `).join('');

    // --- PERBAIKAN UTAMA: Logika pembuatan header tabel yang lebih aman ---
    let tableHeaders = '';
    const formats = (columnFormats && columnFormats.length > 0) ? columnFormats : participantColumns.map(name => ({ name })); // Fallback jika format tidak ada

    tableHeaders = formats.map(format => {
        const colName = format.name.toUpperCase();
        const defaultWidths = { 'NO': 5, 'NIM': 20, 'NAMA': 40, 'TANDA TANGAN': 35 };
        const width = format.width || defaultWidths[colName] || '';

        const style = `
            width: ${width ? width + '%' : 'auto'};
            text-align: ${format.align || 'center'}; 
            font-weight: ${format.weight || 'bold'}; 
            font-size: ${format.size || 12}pt;
        `;
        const colspan = colName.includes('TANDA TANGAN') ? 'colspan="2"' : '';
        return `<th ${colspan} style="${style}">${colName}</th>`;
    }).join('');
    // --- AKHIR PERBAIKAN ---

    const participantRows = participants.split('\n').filter(line => line.trim() !== '').map((line, index) => {
        const columns = line.split(',');
        const rowNumber = index + 1;

        let row1 = `<tr>`;
        row1 += `<td rowspan="2" style="text-align: center; vertical-align: middle;">${rowNumber}</td>`;
        
        const dataColumns = formats.filter(c => !c.name.toUpperCase().includes('TANDA TANGAN') && c.name.toUpperCase() !== 'NO');
        for (let i = 0; i < dataColumns.length; i++) {
            row1 += `<td rowspan="2" style="vertical-align: middle;">${(columns[i] || '').trim()}</td>`;
        }
        
        if (formats.some(c => c.name.toUpperCase().includes('TANDA TANGAN'))) {
            if (rowNumber % 2 !== 0) {
                row1 += `<td style="text-align: left; padding-left: 5px; border-right: 1px solid black; border-bottom: none;">${rowNumber}.</td><td style="border-bottom: none;"></td>`;
            } else {
                row1 += `<td style="border-right: 1px solid black; border-bottom: none;"></td><td style="text-align: left; padding-left: 5px; border-bottom: none;">${rowNumber}.</td>`;
            }
        }
        row1 += `</tr>`;

        let row2 = `<tr>`;
        if (formats.some(c => c.name.toUpperCase().includes('TANDA TANGAN'))) {
            row2 += `<td style="border-right: 1px solid black; border-top: none; height: 20px;"></td><td style="border-top: none;"></td>`;
        }
        row2 += `</tr>`;

        return `<tbody>${row1}${row2}</tbody>`;
    }).join('');

    const createSignatureBlocks = (signatures) => {
        if (!signatures || signatures.length === 0) return '';
        return signatures.map(sig => `
            <div class="signature-block">
                <div>${sig.position}</div>
                <div class="signature-space"></div>
                <div class="signature-name">${sig.name}</div>
            </div>
        `).join('');
    };

    const leftBlocks = createSignatureBlocks(signaturesLeft);
    const centerBlocks = createSignatureBlocks(signaturesCenter);
    const rightBlocks = createSignatureBlocks(signaturesRight);

    const dateLine = `<div>${signatureDate}</div>`;
    const rightContent = (signaturesRight && signaturesRight.length > 0) ? dateLine + rightBlocks : rightBlocks;
    const centerContent = (!rightContent && signaturesCenter && signaturesCenter.length > 0) ? dateLine + centerBlocks : centerBlocks;
    const leftContent = (!rightContent && !centerContent && signaturesLeft && signaturesLeft.length > 0) ? dateLine + leftBlocks : leftBlocks;

    const eventName = headers.find(h => h.key.toLowerCase().includes('acara'))?.value || 'ACARA';
    
    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 0; }
                .page { width: 100%; padding: 0; box-sizing: border-box; }
                .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double black; padding-bottom: 10px; }
                .logo-left { max-width: ${sizeLeft}px; max-height: ${sizeLeft}px; object-fit: contain; }
                .logo-right { max-width: ${sizeRight}px; max-height: ${sizeRight}px; object-fit: contain; }
                .header-title { text-align: center; flex-grow: 1; padding: 0 15px;}
                .header-title h3, .header-title h4 { margin: 0; text-transform: uppercase; }
                .header-title h3 { font-size: 14pt; }
                .header-title h4 { font-size: 13pt; font-weight: normal;}
                .info-table { margin: 20px 0; font-size: 12pt; }
                .info-table td { padding: 2px 0; }
                .main-table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
                .main-table th, .main-table td { border: 1px solid black; padding: 4px 8px; text-align: left; vertical-align: middle; word-wrap: break-word; }
                .main-table tbody { page-break-inside: avoid; }
                .signatures-container { 
                    display: flex; 
                    justify-content: space-between;
                    margin-top: 40px; 
                    width: 100%; 
                    page-break-inside: avoid; 
                }
                .signature-group {
                    display: inline-block;
                    width: 33%;
                }
                .signature-group.left { text-align: left; }
                .signature-group.center { text-align: center; }
                .signature-group.right { text-align: right; }
                .signature-block { margin-top: 15px; }
                .signature-space { height: 70px; }
                .signature-name { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header-container">
                    <img src="${logoLeft || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="logo-left">
                    <div class="header-title">
                        <h3>DAFTAR HADIR</h3>
                        <h4>${eventName}</h4>
                    </div>
                    <img src="${logoRight || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" class="logo-right">
                </div>
                <table class="info-table"><tbody>${headerRows}</tbody></table>
                <table class="main-table">
                    <thead><tr>${tableHeaders}</tr></thead>
                    ${participantRows}
                </table>
                <div class="signatures-container">
                    <div class="signature-group left">${leftContent}</div>
                    <div class="signature-group center">${centerContent}</div>
                    <div class="signature-group right">${rightContent}</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

// 5. Endpoint untuk Generate PDF
app.post('/generate-pdf', async (req, res) => {
    console.log('Menerima permintaan untuk membuat PDF...');
    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();

        const htmlContent = createPdfHtml(req.body);
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const { pageHeader, pageFooter } = req.body;

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: !!(pageHeader || pageFooter),
            headerTemplate: `<div style="font-family: Arial, sans-serif; font-size: 9px; text-align: center; width: 100%; padding: 0 15mm;">${pageHeader || ''}</div>`,
            footerTemplate: `<div style="font-family: Arial, sans-serif; font-size: 9px; text-align: center; width: 100%; padding: 0 15mm;">${pageFooter || ''}</div>`,
            margin: {
                top: pageHeader ? '25mm' : '15mm',
                right: '15mm',
                bottom: pageFooter ? '25mm' : '15mm',
                left: '15mm'
            }
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="daftar-hadir.pdf"');
        res.send(pdfBuffer);
        console.log('PDF berhasil dibuat dan dikirim untuk pratinjau.');

    } catch (error) {
        console.error('Terjadi kesalahan saat membuat PDF:', error);
        res.status(500).send(`Maaf, terjadi kesalahan di server: ${error.message}`);
    }
});

// 6. Jalankan Server
app.listen(port, () => {
    console.log(`🎉 Server berhasil berjalan. Buka http://localhost:${port} di browser Anda.`);
});