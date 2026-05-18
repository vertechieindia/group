import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType
} from "docx";
import type { SendOfferLetterInput } from "@vertechie/types";
import { stateName } from "./offer-compliance";

export async function buildOfferLetterDocx(input: SendOfferLetterInput): Promise<Buffer> {
  const paragraphs = input.draftBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const logo = await fetchLogo(input.companyLogoUrl);

  const doc = new Document({
    sections: [
      {
        headers: { default: buildHeader(input, logo) },
        footers: { default: buildFooter(input) },
        properties: {
          page: {
            margin: { top: 1260, right: 900, bottom: 1080, left: 900, header: 420, footer: 420 }
          }
        },
        children: [
          watermark(input, logo),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: "Formal Offer of Employment", bold: true, size: 34 })]
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: input.companyName, bold: true, size: 24 })] }),
          new Paragraph({ text: "" }),
          summaryTable(input),
          new Paragraph({ text: "" }),
          ...paragraphs.map((block) => paragraphFor(block))
        ]
      }
    ]
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function buildHeader(input: SendOfferLetterInput, logo: LogoData | null) {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 18, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: 64, height: 64 } })] : [new TextRun({ text: input.companyName.slice(0, 2).toUpperCase(), bold: true, size: 28 })]
                  })
                ]
              }),
              new TableCell({
                width: { size: 82, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: input.companyName, bold: true, size: 30 })] }),
                  new Paragraph({ children: [new TextRun({ text: compact([input.companyAddress, input.companyPhone, input.signerEmail, input.companyWebsite].filter(Boolean).join(" | ")), size: 18, color: "475569" })] }),
                  new Paragraph({ children: [new TextRun({ text: compact(["EIN", input.companyEin, "E-Verify", input.eVerifyNumber, "Home State", stateName(input.companyHomeState), "Business ID", input.homeStateBusinessId].filter(Boolean).join(" | ")), size: 18, color: "475569" })] }),
                  ...registrationHeaderLines(input)
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function buildFooter(input: SendOfferLetterInput) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${input.companyName} confidential employment offer | ${input.signerEmail}`, size: 18, color: "64748B" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 18, color: "64748B" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "64748B" })]
      })
    ]
  });
}

function watermark(input: SendOfferLetterInput, logo: LogoData | null) {
  if (!logo) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: input.companyName, bold: true, size: 56, color: "E2E8F0" })]
    });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: logo.type,
        data: logo.data,
        transformation: { width: 300, height: 300 },
        floating: {
          behindDocument: true,
          allowOverlap: true,
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
          wrap: { type: TextWrappingType.NONE }
        }
      })
    ]
  });
}

function summaryTable(input: SendOfferLetterInput) {
  const rows = [
    ["Candidate", input.candidateName, "Position", input.jobTitle],
    ["Start Date", formatDate(input.startDate), "Employment Type", input.employmentType],
    ["Compensation", input.compensation, "Pay Frequency", input.payFrequency],
    ["Department", input.department || "Not specified", "Reports To", input.reportsTo],
    ["Work Location", input.workLocation, "Offer Expires", input.expiryDate ? formatDate(input.expiryDate) : "Not specified"],
    ["Company Home State", stateName(input.companyHomeState), "Home State Business ID", input.homeStateBusinessId || "Not specified"],
    ["E-Verify", input.eVerifyNumber || "Not specified", "Foreign LLC Registrations", foreignRegistrationSummary(input)]
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row) =>
      new TableRow({
        children: row.map((cell, index) =>
          new TableCell({
            width: { size: index % 2 === 0 ? 18 : 32, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: index % 2 === 0 })] })]
          })
        )
      })
    )
  });
}

function registrationHeaderLines(input: SendOfferLetterInput) {
  const foreignStates = operatingForeignStates(input);
  if (!foreignStates.length) return [];
  return [
    new Paragraph({
      children: [new TextRun({ text: compact(foreignStates.map((state) => `${stateName(state)} Foreign LLC Control #: ${controlNumberFor(input, state)}`).join(" | ")), size: 18, color: "475569" })]
    })
  ];
}

function foreignRegistrationSummary(input: SendOfferLetterInput) {
  const foreignStates = operatingForeignStates(input);
  if (!foreignStates.length) return "None listed";
  return foreignStates.map((state) => `${stateName(state)}: ${controlNumberFor(input, state)}`).join("; ");
}

function operatingForeignStates(input: SendOfferLetterInput) {
  return (input.operatingStates.length ? input.operatingStates : [input.companyHomeState]).filter((state) => state !== input.companyHomeState);
}

function controlNumberFor(input: SendOfferLetterInput, state: string) {
  return input.operatingStateRegistrations.find((registration) => registration.state === state)?.foreignControlNumber || "Not specified";
}

type LogoData = { type: "png" | "jpg" | "gif" | "bmp"; data: Buffer };

async function fetchLogo(url?: string | null): Promise<LogoData | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const type = contentType.includes("png") ? "png" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("gif") ? "gif" : contentType.includes("bmp") ? "bmp" : null;
    if (!type) return null;
    return { type, data: Buffer.from(await response.arrayBuffer()) };
  } catch {
    return null;
  }
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function paragraphFor(block: string) {
  const isHeading = block.length < 90 && block === block.toUpperCase();
  return new Paragraph({
    spacing: { after: isHeading ? 160 : 220 },
    heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
    children: [new TextRun({ text: block, bold: isHeading, size: isHeading ? 24 : 22 })]
  });
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}
