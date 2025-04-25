import PDFDocument from 'pdfkit';
import MarkdownIt from 'markdown-it';
import { Buffer } from 'buffer';

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
});

/**
 * Generates a PDF from markdown text using PDFKit (no browser required)
 */
export const generatePdfFromMarkdown = async (markdown: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting PDF generation with PDFKit...');
      // Create a PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      // Create a buffer to store the PDF
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log('PDF generation completed successfully');
        resolve(result);
      });
      
      // Basic document styling
      doc.font('Helvetica');
      doc.fontSize(12);
      
      // Convert markdown to plain text for simple processing
      // Note: PDFKit doesn't directly support markdown or HTML rendering
      // So we'll handle some basic formatting manually
      
      const lines = markdown.split('\n');
      let y = 50; // Starting y position
      
      // Process each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Handle headings
        if (line.startsWith('# ')) {
          doc.fontSize(24).font('Helvetica-Bold');
          doc.text(line.substring(2), {
            align: 'left',
            underline: false
          });
          doc.moveDown(1);
          doc.fontSize(12).font('Helvetica');
        } 
        else if (line.startsWith('## ')) {
          doc.fontSize(20).font('Helvetica-Bold');
          doc.text(line.substring(3), {
            align: 'left',
            underline: false
          });
          doc.moveDown(1);
          doc.fontSize(12).font('Helvetica');
        } 
        else if (line.startsWith('### ')) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text(line.substring(4), {
            align: 'left',
            underline: false
          });
          doc.moveDown(1);
          doc.fontSize(12).font('Helvetica');
        }
        // Handle bullet points
        else if (line.startsWith('- ')) {
          doc.text(`• ${line.substring(2)}`, {
            indent: 20,
            align: 'left'
          });
          doc.moveDown(0.5);
        }
        // Handle numbered lists
        else if (/^\d+\.\s/.test(line)) {
          doc.text(line, {
            indent: 20,
            align: 'left'
          });
          doc.moveDown(0.5);
        }
        // Handle code blocks
        else if (line.startsWith('```')) {
          // Skip the opening ```
          i++;
          doc.font('Courier').fontSize(10);
          
          // Continue until closing ```
          const codeLines = [];
          while (i < lines.length && !lines[i].startsWith('```')) {
            codeLines.push(lines[i]);
            i++;
          }
          
          // Display code block
          doc.rect(50, doc.y, doc.page.width - 100, 10 + 15 * codeLines.length)
             .fill('#f0f0f0');
          
          doc.fill('#000000');
          codeLines.forEach(codeLine => {
            doc.text(codeLine, 60, doc.y + 5);
            doc.moveDown(1);
          });
          
          doc.font('Helvetica').fontSize(12);
          doc.moveDown(1);
        }
        // Handle blockquotes
        else if (line.startsWith('> ')) {
          doc.font('Helvetica-Oblique');
          doc.text(line.substring(2), {
            indent: 20,
            align: 'left'
          });
          doc.font('Helvetica');
          doc.moveDown(0.5);
        }
        // Handle horizontal rules
        else if (line === '---' || line === '***' || line === '___') {
          doc.moveTo(50, doc.y)
             .lineTo(doc.page.width - 50, doc.y)
             .stroke();
          doc.moveDown(1);
        }
        // Normal text
        else if (line !== '') {
          doc.text(line, {
            align: 'left'
          });
          doc.moveDown(0.5);
        }
        // Empty line
        else {
          doc.moveDown(0.5);
        }

        // Add a new page if we're near the bottom
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }
      }
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF with PDFKit:', error);
      reject(new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};