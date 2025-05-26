import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * PDF generation utilities for reports
 * Optimized for performance and error handling
 */

export interface PDFOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  margin?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
}

/**
 * Generate PDF from HTML element
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'report.pdf',
    title = 'Church Report',
    orientation = 'portrait',
    format = 'a4',
    margin = 10
  } = options;

  try {
    // Create canvas from HTML element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Calculate dimensions
    const imgWidth = format === 'a4' ? 210 : 216; // A4 or Letter width in mm
    const pageHeight = format === 'a4' ? 297 : 279; // A4 or Letter height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, margin, margin + 10);

    // Add timestamp
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, margin + 20);

    // Add content
    let heightLeft = imgHeight;
    let position = margin + 30;

    // Add image to PDF
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      margin,
      position,
      imgWidth - (margin * 2),
      imgHeight
    );

    heightLeft -= pageHeight - position - margin;

    // Add new pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        position,
        imgWidth - (margin * 2),
        imgHeight
      );
      heightLeft -= pageHeight - margin;
    }

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generate PDF from data table with optimized performance
 */
export function generateTablePDF(
  data: Record<string, any>[],
  columns: TableColumn[],
  options: PDFOptions = {}
): void {
  if (!data || data.length === 0) {
    throw new Error('No data provided for PDF generation');
  }

  if (!columns || columns.length === 0) {
    throw new Error('No columns provided for PDF generation');
  }

  const {
    filename = 'table-report.pdf',
    title = 'Data Report',
    orientation = 'landscape',
    format = 'a4'
  } = options;

  try {
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

  // Add title
  pdf.setFontSize(16);
  pdf.text(title, 10, 20);

  // Add timestamp
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, 10, 30);

  // Calculate column widths
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const totalWidth = pageWidth - 20; // 10mm margin on each side
  const defaultColumnWidth = totalWidth / columns.length;

  let startY = 40;
  let currentY = startY;

  // Add table headers
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');

  let currentX = 10;
  columns.forEach((column) => {
    const width = column.width || defaultColumnWidth;
    pdf.text(column.label, currentX, currentY);
    currentX += width;
  });

  currentY += 10;

  // Add table data
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);

  data.forEach((row, index) => {
    if (currentY > 270) { // Near bottom of page
      pdf.addPage();
      currentY = 20;
    }

    currentX = 10;
    columns.forEach((column) => {
      const width = column.width || defaultColumnWidth;
      const value = row[column.key] || '';
      pdf.text(String(value), currentX, currentY);
      currentX += width;
    });

    currentY += 7;
  });

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating table PDF:', error);
    throw new Error('Failed to generate table PDF');
  }
}

/**
 * Format currency for PDF display
 */
export function formatCurrencyForPDF(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format date for PDF display
 * Uses timezone-safe formatting to match the attendance history display
 */
export function formatDateForPDF(date: string | Date): string {
  if (!date) return 'N/A';

  try {
    // Handle string dates (YYYY-MM-DD format) without timezone conversion
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(part => parseInt(part, 10));
      const dateObj = new Date(year, month - 1, day);

      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    // Handle Date objects
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date for PDF:', error);
    return 'Invalid date';
  }
}
