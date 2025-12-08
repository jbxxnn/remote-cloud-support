import jsPDF from 'jspdf';

interface SOPStep {
  step?: number;
  action?: string;
  details?: string;
  description?: string;
  text?: string;
  content?: string;
}

interface CompletedStep {
  step: number;
  action: string;
  completedAt: string;
  notes?: string | null;
}

interface Evidence {
  id: string;
  evidenceType: 'photo' | 'text' | 'file' | 'recording';
  fileName?: string;
  description?: string;
  createdAt: string;
}

interface SOPResponseData {
  id: string;
  sopName: string;
  clientName: string;
  staffName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  steps: SOPStep[];
  completedSteps: CompletedStep[];
  evidence?: Evidence[];
  alertMessage?: string;
}

export function generateSOPResponsePDF(data: SOPResponseData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * (fontSize * 0.4); // Approximate line height
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SOP Response Report', margin, yPosition);
  yPosition += 10;

  // RCE Branding (if logo available, add it here)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('RCE SupportSense', margin, yPosition);
  yPosition += 15;

  // SOP Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SOP Details', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPosition += addWrappedText(`SOP Name: ${data.sopName}`, margin, yPosition, contentWidth);
  yPosition += 5;
  yPosition += addWrappedText(`Status: ${data.status.toUpperCase()}`, margin, yPosition, contentWidth);
  yPosition += 5;
  yPosition += addWrappedText(`Started: ${new Date(data.startedAt).toLocaleString()}`, margin, yPosition, contentWidth);
  if (data.completedAt) {
    yPosition += 5;
    yPosition += addWrappedText(`Completed: ${new Date(data.completedAt).toLocaleString()}`, margin, yPosition, contentWidth);
  }
  yPosition += 10;

  checkPageBreak(20);

  // Client Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPosition += addWrappedText(`Client: ${data.clientName}`, margin, yPosition, contentWidth);
  yPosition += 5;
  yPosition += addWrappedText(`Completed By: ${data.staffName}`, margin, yPosition, contentWidth);
  yPosition += 10;

  checkPageBreak(20);

  // Alert Information (if applicable)
  if (data.alertMessage) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Related Alert', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 0, 0);
    yPosition += addWrappedText(data.alertMessage, margin, yPosition, contentWidth);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    checkPageBreak(20);
  }

  // Completed Steps
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Completed Steps', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  data.completedSteps.forEach((completedStep, index) => {
    checkPageBreak(30);

    // Step number and action
    doc.setFont('helvetica', 'bold');
    yPosition += addWrappedText(
      `Step ${completedStep.step}: ${completedStep.action}`,
      margin,
      yPosition,
      contentWidth
    );
    yPosition += 5;

    // Completion timestamp
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    yPosition += addWrappedText(
      `Completed: ${new Date(completedStep.completedAt).toLocaleString()}`,
      margin,
      yPosition,
      contentWidth,
      9
    );
    yPosition += 5;

    // Notes
    if (completedStep.notes) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      yPosition += addWrappedText(`Notes: ${completedStep.notes}`, margin + 5, yPosition, contentWidth - 5);
      yPosition += 5;
    }

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  });

  yPosition += 10;
  checkPageBreak(20);

  // Evidence Attachments
  if (data.evidence && data.evidence.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evidence Attachments', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    data.evidence.forEach((evidence) => {
      checkPageBreak(15);

      const evidenceType = evidence.evidenceType.charAt(0).toUpperCase() + evidence.evidenceType.slice(1);
      const evidenceName = evidence.fileName || evidence.description || 'Evidence';
      const evidenceDate = new Date(evidence.createdAt).toLocaleString();

      yPosition += addWrappedText(
        `• ${evidenceType}: ${evidenceName} (${evidenceDate})`,
        margin,
        yPosition,
        contentWidth
      );
      yPosition += 5;
    });

    yPosition += 10;
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Generated: ${new Date().toLocaleString()}`,
      margin,
      pageHeight - 10
    );
  }

  return doc;
}

