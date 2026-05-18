import type { Timesheet } from "@vertechie/types";

type PdfPage = {
  commands: string[];
  y: number;
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 48;
const contentBottom = 54;

export function buildTimesheetPdf(timesheet: Timesheet) {
  const pages: PdfPage[] = [{ commands: [], y: pageHeight - margin }];
  let page = pages[0];

  function currentPage() {
    page = pages[pages.length - 1];
    return page;
  }

  function addPage() {
    pages.push({ commands: [], y: pageHeight - margin });
    page = currentPage();
  }

  function ensure(space: number) {
    if (currentPage().y - space < contentBottom) addPage();
  }

  function text(value: unknown, x: number, y: number, options: { size?: number; bold?: boolean; width?: number } = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? "F2" : "F1";
    const lines = wrap(String(value ?? ""), options.width ?? pageWidth - margin * 2, size);
    for (const [index, line] of lines.entries()) {
      currentPage().commands.push(`BT /${font} ${size} Tf ${x} ${y - index * (size + 4)} Td (${escapePdf(line)}) Tj ET`);
    }
    return lines.length * (size + 4);
  }

  function rule(y: number) {
    currentPage().commands.push(`0.84 0.89 0.92 RG ${margin} ${y} m ${pageWidth - margin} ${y} l S 0 0 0 RG`);
  }

  function row(cells: string[], widths: number[], options: { header?: boolean } = {}) {
    ensure(34);
    const y = currentPage().y;
    if (options.header) {
      currentPage().commands.push(`0.91 0.95 0.96 rg ${margin} ${y - 20} ${pageWidth - margin * 2} 24 re f 0 0 0 rg`);
    }
    let x = margin;
    let maxHeight = 18;
    cells.forEach((cell, index) => {
      const height = text(cell, x + 4, y - 14, { size: options.header ? 8 : 9, bold: options.header, width: widths[index] - 8 });
      maxHeight = Math.max(maxHeight, height);
      x += widths[index];
    });
    currentPage().y -= Math.max(28, maxHeight + 8);
    rule(currentPage().y + 8);
  }

  text("Timesheet Record", margin, currentPage().y, { size: 22, bold: true });
  text(`${timesheet.employeeName ?? "Employee"} - ${timesheet.entityName ?? "Company"}`, margin, currentPage().y - 28, { size: 11 });
  currentPage().y -= 58;
  rule(currentPage().y);
  currentPage().y -= 20;

  const summaryRows = [
    ["Status", label(timesheet.status), "Period", `${timesheet.periodStart} to ${timesheet.periodEnd}`],
    ["Type", label(timesheet.periodType), "Client", timesheet.clientName ?? "Unassigned"],
    ["Project", timesheet.projectName ?? "Unassigned", "Total Hours", hours(timesheet.totalHours)],
    ["Billable", hours(timesheet.billableHours), "Non-billable", hours(timesheet.nonBillableHours)]
  ];
  for (const item of summaryRows) {
    ensure(22);
    const y = currentPage().y;
    text(item[0], margin, y, { size: 8, bold: true, width: 90 });
    text(item[1], margin + 92, y, { size: 10, width: 165 });
    text(item[2], margin + 270, y, { size: 8, bold: true, width: 95 });
    text(item[3], margin + 368, y, { size: 10, width: 160 });
    currentPage().y -= 24;
  }

  currentPage().y -= 12;
  text("Daily Entries", margin, currentPage().y, { size: 14, bold: true });
  currentPage().y -= 24;
  row(["Date", "Type", "Paid", "Billable", "Hours", "Client / Project", "Notes"], [62, 72, 42, 52, 44, 132, 112], { header: true });

  const entries = [...timesheet.entries].sort((a, b) => a.workDate.localeCompare(b.workDate));
  for (const entry of entries) {
    row([
      entry.workDate,
      label(entry.dayType),
      entry.isPaid ? "Yes" : "No",
      entry.isBillable ? "Yes" : "No",
      hours(entry.hoursWorked),
      `${entry.clientName ?? timesheet.clientName ?? "Unassigned"} / ${entry.projectName ?? timesheet.projectName ?? "Unassigned"}`,
      entry.taskDescription || ""
    ], [62, 72, 42, 52, 44, 132, 112]);
  }

  currentPage().y -= 16;
  ensure(110);
  text("Employee Notes", margin, currentPage().y, { size: 12, bold: true });
  const noteHeight = text(timesheet.employeeNotes || "No employee notes recorded.", margin, currentPage().y - 18, { size: 10, width: pageWidth - margin * 2 });
  currentPage().y -= noteHeight + 34;
  text("Reviewer Comments", margin, currentPage().y, { size: 12, bold: true });
  const reviewHeight = text(timesheet.reviewerComments || "No reviewer comments recorded.", margin, currentPage().y - 18, { size: 10, width: pageWidth - margin * 2 });
  currentPage().y -= reviewHeight + 34;

  ensure(80);
  text("Attachments", margin, currentPage().y, { size: 12, bold: true });
  currentPage().y -= 18;
  if (timesheet.attachments.length) {
    for (const attachment of timesheet.attachments) {
      ensure(20);
      text(`- ${attachment.fileName} (${attachment.attachmentType ?? "document"})`, margin, currentPage().y, { size: 10 });
      currentPage().y -= 18;
    }
  } else {
    text("No attachments uploaded.", margin, currentPage().y, { size: 10 });
    currentPage().y -= 18;
  }

  pages.forEach((pdfPage, index) => {
    pdfPage.commands.push(`BT /F1 8 Tf ${margin} 28 Td (${escapePdf(`Generated from VerTechie Group Workforce OS - Page ${index + 1} of ${pages.length}`)}) Tj ET`);
    pdfPage.commands.unshift("0.05 0.49 0.44 rg 0 756 612 36 re f", "1 1 1 rg", `BT /F2 12 Tf 48 768 Td (${escapePdf(timesheet.entityName ?? "Company")}) Tj ET`, "0 0 0 rg");
  });

  return assemblePdf(pages.map((pdfPage) => pdfPage.commands.join("\n")));
}

function assemblePdf(pageContents: string[]) {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjectIds = pageContents.map((_, index) => 5 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageContents.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pageContents.forEach((content, index) => {
    const contentObjectId = 6 + index * 2;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function wrap(value: string, width: number, size: number) {
  const normalized = value.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function hours(value: number) {
  return Number(value ?? 0).toFixed(2);
}
