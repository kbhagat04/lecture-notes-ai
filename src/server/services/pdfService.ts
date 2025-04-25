import * as htmlPdf from 'html-pdf-node';
import marked from 'marked';

// Convert markdown to HTML
const markdownToHtml = (markdown: string): string => {
  const html = marked.parse(markdown);
  // Add CSS styling to make the PDF look nicer
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 40px;
          color: #333;
        }
        h1, h2, h3, h4 {
          color: #3d5a80;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        h1 {
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 8px;
        }
        h2 {
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 6px;
        }
        p {
          margin: 16px 0;
        }
        ul, ol {
          padding-left: 25px;
          margin: 16px 0;
        }
        li {
          margin: 6px 0;
        }
        blockquote {
          margin: 16px 0;
          padding: 0 16px;
          color: #6c757d;
          border-left: 4px solid #ced4da;
        }
        code {
          background-color: #f1f3f5;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: Consolas, Monaco, 'Andale Mono', monospace;
          color: #e83e8c;
        }
        pre {
          background-color: #f1f3f5;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        th {
          background-color: #f2f2f2;
          text-align: left;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
};

// Generate PDF from markdown
export const generatePdfFromMarkdown = async (markdown: string): Promise<Buffer> => {
  try {
    const htmlContent = markdownToHtml(markdown);
    const options = { 
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    };
    const file = { content: htmlContent };
    
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF file');
  }
};