import { jsPDF } from "jspdf";

const DEFAULT_STATUS_STYLES = {
  Present: { fill: [226, 247, 235], text: [20, 116, 67], label: "PRESENT" },
  Late: { fill: [255, 243, 220], text: [156, 91, 12], label: "LATE" },
  Absent: { fill: [255, 231, 235], text: [180, 35, 61], label: "ABSENT" },
  "Not recorded": {
    fill: [239, 243, 248],
    text: [91, 105, 125],
    label: "UNMARKED",
  },
  Active: { fill: [226, 247, 235], text: [20, 116, 67], label: "ACTIVE" },
  Inactive: { fill: [239, 243, 248], text: [91, 105, 125], label: "INACTIVE" },
  Verified: { fill: [226, 247, 235], text: [20, 116, 67], label: "VERIFIED" },
  Unverified: {
    fill: [255, 243, 220],
    text: [156, 91, 12],
    label: "UNVERIFIED",
  },
};

const DEFAULT_PALETTE = {
  ink: [24, 38, 74],
  muted: [105, 121, 145],
  header: [18, 29, 67],
  accent: [106, 65, 226],
  tableHeader: [36, 48, 80],
};

export const getCachedSchoolReportProfile = () => {
  let auth = {};
  try {
    auth = JSON.parse(localStorage.getItem("schoolAuth") || "{}");
  } catch {
    // Use the fallback cache key for a malformed/missing session.
  }

  try {
    const cached = JSON.parse(
      localStorage.getItem(
        `schoolProfileCache:${auth.user?.id || "current"}`,
      ) || "null",
    );
    return cached?.data || {};
  } catch {
    return {};
  }
};

const toImageData = async (source) => {
  if (typeof source !== "string" || !source) return null;
  if (source.startsWith("data:image/")) return source;
  try {
    const response = await fetch(source);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const imageFormat = (data) => {
  if (
    data?.startsWith("data:image/jpeg") ||
    data?.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  if (data?.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
};

const drawMetadata = (pdf, metadata, { margin, contentWidth, ink, muted }) => {
  if (!metadata.length) return;
  const y = 49;
  const height = 21;
  const itemWidth = contentWidth / metadata.length;
  pdf.setFillColor(248, 250, 253);
  pdf.setDrawColor(230, 235, 243);
  pdf.roundedRect(margin, y, contentWidth, height, 2, 2, "FD");
  metadata.forEach(({ label, value }, index) => {
    const x = margin + index * itemWidth + 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.7);
    pdf.setTextColor(...muted);
    pdf.text(String(label).toUpperCase(), x, y + 7);
    pdf.setFontSize(7.2);
    pdf.setTextColor(...ink);
    const lines = pdf.splitTextToSize(String(value ?? "—"), itemWidth - 8);
    pdf.text(lines.slice(0, 1), x, y + 14);
  });
};

const drawSummaryCards = (pdf, summaryCards, { margin, contentWidth, ink }) => {
  if (!summaryCards.length) return;
  const y = 78;
  const gap = 2.5;
  const cardWidth =
    (contentWidth - gap * (summaryCards.length - 1)) / summaryCards.length;
  summaryCards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap);
    const color = card.color || [47, 96, 187];
    const tint = card.tint || [235, 243, 255];
    pdf.setFillColor(...tint);
    pdf.setDrawColor(232, 237, 245);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(x, y, cardWidth, 23, 2.4, 2.4, "FD");
    pdf.setFillColor(...color);
    pdf.circle(x + 4.5, y + 6, 1.1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...color);
    pdf.text(String(card.label).toUpperCase(), x + 7, y + 6.7);
    pdf.setFontSize(13);
    pdf.setTextColor(...ink);
    pdf.text(String(card.value ?? 0), x + 4, y + 18);
  });
};

const drawTableHeader = (
  pdf,
  columns,
  { margin, contentWidth, y, tableHeaderColor },
) => {
  const scale =
    contentWidth / columns.reduce((sum, column) => sum + column.width, 0);
  const scaledColumns = columns.map((column) => ({
    ...column,
    scaledWidth: column.width * scale,
  }));
  pdf.setFillColor(...tableHeaderColor);
  pdf.roundedRect(margin, y, contentWidth, 10, 1.8, 1.8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.4);
  pdf.setTextColor(255, 255, 255);
  let x = margin;
  scaledColumns.forEach((column) => {
    pdf.text(String(column.title).toUpperCase(), x + 3, y + 6.6);
    x += column.scaledWidth;
  });
  return { columns: scaledColumns, nextY: y + 12 };
};

const drawReportHeader = (pdf, options, includeSummary) => {
  const {
    pageWidth,
    margin,
    contentWidth,
    schoolName,
    schoolLogo,
    title,
    badgeLabel,
    metadata,
    summaryCards,
    ink,
    muted,
    headerColor,
    accent,
    tableHeaderColor,
  } = options;
  pdf.setFillColor(...headerColor);
  pdf.rect(0, 0, pageWidth, 43, "F");
  pdf.setFillColor(...accent);
  pdf.rect(0, 43, pageWidth, 2, "F");

  let titleX = margin;
  if (schoolLogo) {
    try {
      const dimensions = pdf.getImageProperties(schoolLogo);
      const fitSize = 13;
      const ratio = Math.min(
        fitSize / dimensions.width,
        fitSize / dimensions.height,
      );
      const width = dimensions.width * ratio;
      const height = dimensions.height * ratio;
      pdf.addImage(
        schoolLogo,
        imageFormat(schoolLogo),
        margin,
        8 + (fitSize - height) / 2,
        width,
        height,
      );
      titleX = margin + 17;
    } catch {
      // A malformed/unavailable logo should not prevent report download.
    }
  }

  if (titleX === margin) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, 8, 7, 7, 2, 2, "F");
    pdf.setFillColor(...accent);
    pdf.circle(margin + 3.5, 11.5, 1.2, "F");
    titleX = margin + 10;
  }
  pdf.setTextColor(196, 210, 235);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("TRACK MY KID  /  SCHOOL MANAGEMENT", titleX, 12.5);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(19);
  pdf.text(title, margin, 27);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(210, 220, 240);
  pdf.text(schoolName, margin, 36);
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(255, 255, 255);
  pdf.roundedRect(pageWidth - margin - 31, 9, 31, 8, 4, 4, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.1);
  pdf.setTextColor(76, 53, 165);
  pdf.text(badgeLabel, pageWidth - margin - 15.5, 14, { align: "center" });

  if (includeSummary) {
    drawMetadata(pdf, metadata, { margin, contentWidth, ink, muted });
    drawSummaryCards(pdf, summaryCards, { margin, contentWidth, ink });
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(`${schoolName}  ·  ${title}`, margin, 57);
  }

  const headerY = includeSummary ? (summaryCards.length ? 109 : 78) : 66;
  return drawTableHeader(pdf, options.columns, {
    margin,
    contentWidth,
    y: headerY,
    tableHeaderColor,
  });
};

const measureRecordRow = (pdf, record, columns) => {
  const values = columns.map((column) => String(record[column.key] ?? "—"));
  const lines = values.map((value, index) =>
    pdf.splitTextToSize(value, columns[index].scaledWidth - 6),
  );
  return {
    values,
    lines,
    height: Math.max(
      12,
      Math.max(...lines.map((line) => line.length)) * 4.2 + 4,
    ),
  };
};

const drawRecordRow = (pdf, record, index, y, layout) => {
  const { columns, margin, contentWidth, pageWidth } = layout;
  const values = columns.map((column) => String(record[column.key] ?? "—"));
  const lines = values.map((value, columnIndex) =>
    pdf.splitTextToSize(value, columns[columnIndex].scaledWidth - 6),
  );
  const rowHeight = Math.max(
    12,
    Math.max(...lines.map((line) => line.length)) * 4.2 + 4,
  );
  if (index % 2 === 0) {
    pdf.setFillColor(249, 251, 254);
    pdf.roundedRect(margin, y, contentWidth, rowHeight, 1.2, 1.2, "F");
  }
  pdf.setDrawColor(235, 239, 245);
  pdf.setLineWidth(0.15);
  pdf.line(margin + 1, y + rowHeight, pageWidth - margin - 1, y + rowHeight);

  let x = margin;
  lines.forEach((value, columnIndex) => {
    const column = columns[columnIndex];
    if (column.type === "status") return;
    const emphasize = column.emphasize === true;
    pdf.setFont("helvetica", emphasize ? "bold" : "normal");
    pdf.setFontSize(emphasize ? 8.2 : 7.6);
    pdf.setTextColor(...(emphasize ? DEFAULT_PALETTE.ink : [66, 81, 103]));
    const textHeight = value.length * 4.2;
    const textStartY = y + Math.max(5.5, (rowHeight - textHeight) / 2 + 2.8);
    pdf.text(value, x + 3, textStartY, { lineHeightFactor: 1.15 });
    x += column.scaledWidth;
  });

  const statusColumnIndex = columns.findIndex(
    (column) => column.type === "status",
  );
  if (statusColumnIndex >= 0) {
    const column = columns[statusColumnIndex];
    const style =
      column.statusStyles?.[record[column.key]] ||
      DEFAULT_STATUS_STYLES[record[column.key]];
    if (style) {
      const columnX =
        margin +
        columns
          .slice(0, statusColumnIndex)
          .reduce((sum, item) => sum + item.scaledWidth, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.2);
      const label = style.label || String(record[column.key]).toUpperCase();
      const pillWidth = Math.min(
        column.scaledWidth - 4,
        pdf.getTextWidth(label) + 7,
      );
      const pillHeight = 6.5;
      const pillX = columnX + (column.scaledWidth - pillWidth) / 2;
      const pillY = y + (rowHeight - pillHeight) / 2;
      pdf.setFillColor(...style.fill);
      pdf.roundedRect(pillX, pillY, pillWidth, pillHeight, 3.2, 3.2, "F");
      pdf.setTextColor(...style.text);
      pdf.text(label, pillX + pillWidth / 2, pillY + 4.35, { align: "center" });
    }
  }

  return rowHeight;
};

/** Download a configurable, polished, multi-page school report PDF. */
export const downloadSchoolReport = async ({
  records = [],
  columns: reportColumns,
  title = "School report",
  schoolName = "School report",
  schoolLogo = null,
  badgeLabel = "OFFICIAL REPORT",
  metadata = [],
  summaryCards = [],
  fileName = "school-report.pdf",
  subject = "School management report",
  generatedAt = new Date().toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  }),
} = {}) => {
  if (!Array.isArray(reportColumns) || reportColumns.length === 0) {
    throw new Error("At least one report column is required.");
  }
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const logoData = await toImageData(schoolLogo);
  const reportOptions = {
    pageWidth,
    margin,
    contentWidth,
    schoolName,
    schoolLogo: logoData,
    title,
    badgeLabel,
    metadata: [...metadata, { label: "Generated", value: generatedAt }],
    summaryCards,
    columns: reportColumns,
    ink: DEFAULT_PALETTE.ink,
    muted: DEFAULT_PALETTE.muted,
    headerColor: DEFAULT_PALETTE.header,
    accent: DEFAULT_PALETTE.accent,
    tableHeaderColor: DEFAULT_PALETTE.tableHeader,
  };

  let table = drawReportHeader(pdf, reportOptions, true);
  let rowIndex = 0;
  records.forEach((record) => {
    const measuredRow = measureRecordRow(pdf, record, table.columns);
    if (table.nextY + measuredRow.height > pageHeight - 18) {
      pdf.addPage();
      table = drawReportHeader(pdf, reportOptions, false);
    }
    table.nextY += drawRecordRow(pdf, record, rowIndex, table.nextY, {
      columns: table.columns,
      margin,
      contentWidth,
      pageWidth,
    });
    rowIndex += 1;
  });

  const pageCount = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated ${generatedAt}`, margin, pageHeight - 7);
    pdf.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    );
  }

  pdf.setProperties({ title, subject, author: "Track My Kid School Portal" });
  pdf.save(fileName);
};
