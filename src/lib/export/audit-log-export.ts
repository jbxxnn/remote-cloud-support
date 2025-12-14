/**
 * Audit Log Export Service
 * 
 * Generates CSV and PDF exports of audit logs for compliance reporting
 */

import jsPDF from 'jspdf';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  result: 'success' | 'failure' | 'warning';
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
}

/**
 * Generate CSV export of audit logs
 */
export function generateCSVExport(logs: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'User',
    'Module',
    'Action',
    'Entity Type',
    'Entity ID',
    'Result',
    'Details',
  ];

  const rows = logs.map((log) => [
    new Date(log.timestamp).toISOString(),
    log.userName || log.userId || 'System',
    log.module,
    log.action,
    log.entityType || '',
    log.entityId || '',
    log.result,
    log.details || '',
  ]);

  // Escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];

  return csvRows.join('\n');
}

/**
 * Generate PDF export of audit logs
 */
export function generatePDFExport(
  logs: AuditLogEntry[],
  options: { title?: string; dateRange?: { start: string; end: string } } = {}
): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Audit Log Export', margin, yPosition);
  yPosition += lineHeight * 2;

  // Date range
  if (options.dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Date Range: ${new Date(options.dateRange.start).toLocaleDateString()} - ${new Date(options.dateRange.end).toLocaleDateString()}`,
      margin,
      yPosition
    );
    yPosition += lineHeight;
  }

  // Generated timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPosition);
  yPosition += lineHeight;

  const total = logs.length;
  const success = logs.filter((l) => l.result === 'success').length;
  const failure = logs.filter((l) => l.result === 'failure').length;
  const warning = logs.filter((l) => l.result === 'warning').length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Entries: ${total}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Success: ${success}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Failure: ${failure}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Warning: ${warning}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const headers = ['Timestamp', 'User', 'Module', 'Action', 'Result'];
  const colWidths = [40, 30, 35, 40, 25];
  let xPosition = margin;

  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });

  yPosition += lineHeight;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight * 0.5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  logs.forEach((log, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - margin - lineHeight * 3) {
      doc.addPage();
      yPosition = margin;
    }

    xPosition = margin;
    const rowData = [
      new Date(log.timestamp).toLocaleString(),
      log.userName || log.userId || 'System',
      log.module,
      log.action,
      log.result,
    ];

    rowData.forEach((data, colIndex) => {
      const text = String(data).substring(0, 20); // Truncate long text
      doc.text(text, xPosition, yPosition);
      xPosition += colWidths[colIndex];
    });

    yPosition += lineHeight;

    // Add details if available
    if (log.details && yPosition < pageHeight - margin - lineHeight * 2) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      const details = log.details.substring(0, 80);
      doc.text(`  ${details}`, margin + 5, yPosition);
      yPosition += lineHeight;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
    }
  });

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 10
    );
  }

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

/**
 * Collect audit log data from various sources
 */
export async function collectAuditLogs(
  dateRange?: { start: string; end: string }
): Promise<AuditLogEntry[]> {
  // This would typically query an audit log table
  // For now, we'll collect from various sources:
  // - SOP responses (creation, completion)
  // - Incidents (creation, review, finalization)
  // - Alert events (acknowledgment, resolution)
  // - Validation results

  const logs: AuditLogEntry[] = [];

  // Note: In a real implementation, this would query a dedicated audit log table
  // For now, we'll return an empty array and let the API handle data collection
  return logs;
}

/**
 * Format audit log entry for export
 */
export function formatAuditLogEntry(entry: any): AuditLogEntry {
  return {
    id: entry.id || '',
    timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
    userId: entry.userId || entry.staffId || entry.createdBy,
    userName: entry.userName || entry.staffName || entry.createdByName,
    module: entry.module || 'Unknown',
    action: entry.action || entry.eventType || entry.status || 'Unknown',
    entityType: entry.entityType || entry.type,
    entityId: entry.entityId || entry.id,
    result: entry.result || (entry.status === 'completed' ? 'success' : 'warning'),
    details: entry.details || entry.message || entry.description,
    metadata: entry.metadata || {},
  };
}

