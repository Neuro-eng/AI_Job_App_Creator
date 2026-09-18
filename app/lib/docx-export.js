import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

// Section headers the AI is instructed to produce for the CV.
const KNOWN_HEADERS = [
  "SUMMARY",
  "CORE SKILLS",
  "SKILLS",
  "PROFESSIONAL EXPERIENCE",
  "EXPERIENCE",
  "EDUCATION",
  "CERTIFICATIONS",
];

function isSectionHeading(line) {
  const clean = line.trim().replace(/:$/, "");
  if (!clean) return false;
  return KNOWN_HEADERS.includes(clean.toUpperCase()) && clean === clean.toUpperCase();
}

function isBullet(line) {
  return /^[-•]\s+/.test(line.trim());
}

// Builds a polished Word document from the AI's plain-text CV output.
// First non-empty line is treated as the candidate's name (title).
// A line containing "|" near the top is treated as the contact info line.
// ALL-CAPS known section headers become styled headings.
// Lines starting with "-" become real bullet points, not text dashes.
export function buildCvDocument(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const children = [];

  let nameSet = false;
  let contactSet = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      continue;
    }

    // Safety check: if this line is itself a known section heading, never
    // treat it as name/title/contact — jump straight to heading handling,
    // and lock name/title/contact detection off from this point forward.
    if (isSectionHeading(trimmed)) {
      nameSet = true;
      contactSet = true;
      children.push(
        new Paragraph({
          spacing: { before: 280, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "1A1A1A", space: 2 },
          },
          children: [
            new TextRun({ text: trimmed.toUpperCase(), bold: true, size: 24, color: "1A1A1A" }),
          ],
        })
      );
      continue;
    }

    // First real line (and not a heading) = candidate name
    if (!nameSet) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({ text: trimmed, bold: true, size: 32, color: "1A1A1A" }),
          ],
        })
      );
      nameSet = true;
      continue;
    }

    // Contact line (contains @ or | or starts with a phone-like pattern)
    if (!contactSet && (trimmed.includes("|") || trimmed.includes("@") || /^\+?\d/.test(trimmed))) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 8 },
          },
          children: [new TextRun({ text: trimmed, size: 20, color: "555555" })],
        })
      );
      contactSet = true;
      continue;
    }

    // Role/title line — only ever the single line right after the name,
    // before a contact line has appeared.
    if (nameSet && !contactSet && !isBullet(trimmed)) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: trimmed, size: 24, color: "3B6FED", bold: true })],
        })
      );
      continue;
    }

    if (isBullet(trimmed)) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: trimmed.replace(/^[-•]\s+/, ""), size: 22 })],
        })
      );
      continue;
    }

    // Regular paragraph text
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: trimmed, size: 22 })],
      })
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });
}

// Builds a simpler Word document for the cover letter: no headings/bullets,
// just clean justified paragraphs in a readable font size.
export function buildCoverLetterDocument(rawText) {
  const paragraphs = rawText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const children = paragraphs.map(
    (p) =>
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: p, size: 22 })],
      })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 1080, right: 1080 } },
        },
        children,
      },
    ],
  });
}

export async function downloadAsDocx(buildFn, rawText, filename) {
  const doc = buildFn(rawText);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
