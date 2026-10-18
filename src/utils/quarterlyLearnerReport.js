import { jsPDF } from "jspdf";

const PALETTE = {
  ink: [24, 38, 74],
  muted: [105, 121, 145],
  accent: [20, 118, 110],
  pale: [238, 249, 247],
  line: [207, 220, 229],
};

const imageData = async (source) => {
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

const learnerName = (report) =>
  [report.child?.name, report.child?.lastname].filter(Boolean).join(" ") ||
  "Learner";

export const downloadQuarterlyLearnerReport = async (report, school = {}) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const logo = await imageData(school.logo);
  let y = 18;

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - 18) return;
    pdf.addPage();
    y = 18;
  };
  const section = (title, body) => {
    const lines = pdf.splitTextToSize(body || "Not provided.", contentWidth - 8);
    const height = 13 + lines.length * 5;
    ensureSpace(height);
    pdf.setFillColor(...PALETTE.pale);
    pdf.roundedRect(margin, y, contentWidth, height, 2, 2, "F");
    pdf.setTextColor(...PALETTE.accent);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title, margin + 4, y + 6);
    pdf.setTextColor(...PALETTE.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(lines, margin + 4, y + 12);
    y += height + 4;
  };

  pdf.setFillColor(...PALETTE.accent);
  pdf.rect(0, 0, pageWidth, 8, "F");
  y = 18;
  if (logo) {
    try {
      pdf.addImage(logo, logo.includes("image/png") ? "PNG" : "JPEG", margin, y, 20, 20);
    } catch {
      // Continue with a text-only school header when the logo format is unsupported.
    }
  }
  pdf.setTextColor(...PALETTE.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(school.name || "School", logo ? margin + 25 : margin, y + 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...PALETTE.muted);
  pdf.text(
    [school.address, school.school_email || school.email, school.phone]
      .filter(Boolean)
      .join(" · ") || "Official school learner report",
    logo ? margin + 25 : margin,
    y + 13,
    { maxWidth: contentWidth - (logo ? 25 : 0) },
  );
  y += 29;

  pdf.setDrawColor(...PALETTE.line);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 9;
  pdf.setTextColor(...PALETTE.accent);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("QUARTERLY LEARNER REPORT", margin, y);
  y += 8;
  pdf.setTextColor(...PALETTE.ink);
  pdf.setFontSize(10);
  pdf.text(`Student: ${learnerName(report)}`, margin, y);
  pdf.text(
    `Grade / class: ${report.child?.grade || "Not assigned"}`,
    margin + 100,
    y,
  );
  y += 6;
  pdf.text(`Academic year: ${report.academic_year}`, margin, y);
  pdf.text(`Quarter: ${report.quarter}`, margin + 100, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setTextColor(...PALETTE.muted);
  pdf.text(
    `Reporting period: ${report.period_start} to ${report.period_end}`,
    margin,
    y,
  );
  y += 10;

  ensureSpace(16 + (report.subjects || []).length * 8);
  pdf.setFillColor(...PALETTE.accent);
  pdf.rect(margin, y, contentWidth, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("SUBJECT", margin + 3, y + 5.5);
  pdf.text("MARK", margin + 62, y + 5.5);
  pdf.text("GRADE", margin + 84, y + 5.5);
  pdf.text("RESULT", margin + 106, y + 5.5);
  pdf.text("TEACHER COMMENT", margin + 137, y + 5.5);
  y += 8;
  (report.subjects || []).forEach((subject, index) => {
    ensureSpace(8);
    if (index % 2 === 0) {
      pdf.setFillColor(247, 250, 252);
      pdf.rect(margin, y, contentWidth, 8, "F");
    }
    pdf.setTextColor(...PALETTE.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(subject.name || "", margin + 3, y + 5.2, { maxWidth: 72 });
    pdf.text(`${subject.score_pct}%`, margin + 62, y + 5.2);
    pdf.text(subject.grade || "—", margin + 84, y + 5.2);
    pdf.text(subject.passed ? "Pass" : "Support", margin + 106, y + 5.2);
    pdf.text(subject.teacher_comment || "—", margin + 137, y + 5.2, {
      maxWidth: contentWidth - 140,
    });
    y += 8;
  });
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...PALETTE.accent);
  pdf.text(
    `Average mark: ${report.average_mark_pct}%     Subject pass rate: ${report.pass_rate_pct}%`,
    margin,
    y,
  );
  y += 10;

  const attendance = report.attendance || {};
  section(
    "Attendance record",
    `Present: ${attendance.present || 0} days · Late: ${attendance.late || 0} days · Absent: ${attendance.absent || 0} days · Records: ${attendance.recorded_days || 0}${report.absence_notes ? `\nAbsence notes: ${report.absence_notes}` : ""}`,
  );
  section("Behavior and participation", report.behavioral_assessment);
  section("Extracurricular activities and achievements", report.extracurricular_activities);
  section("Teacher’s overall comments", report.teacher_comments);
  section("Areas to improve and recommended next steps", report.recommendations);

  ensureSpace(37);
  y += 4;
  pdf.setDrawColor(...PALETTE.line);
  pdf.line(margin, y, margin + 75, y);
  pdf.line(pageWidth - margin - 75, y, pageWidth - margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PALETTE.muted);
  pdf.text("Teacher name and signature", margin, y + 5);
  pdf.text("Parent / guardian signature", pageWidth - margin - 75, y + 5);
  pdf.setDrawColor(...PALETTE.accent);
  pdf.circle(pageWidth - margin - 17, y + 24, 12);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6);
  pdf.setTextColor(...PALETTE.accent);
  pdf.text("SCHOOL", pageWidth - margin - 17, y + 22, { align: "center" });
  pdf.text("STAMP", pageWidth - margin - 17, y + 26, { align: "center" });
  pdf.setFontSize(7);
  pdf.text(
    `${school.name || "School"} · Official quarterly report`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" },
  );

  pdf.setProperties({
    title: `${learnerName(report)} quarterly learner report`,
    subject: `Quarter ${report.quarter} ${report.academic_year} school report`,
    author: school.name || "Track My Kid School Portal",
  });
  pdf.save(
    `${learnerName(report).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-q${report.quarter}-${report.academic_year}-report.pdf`,
  );
};
