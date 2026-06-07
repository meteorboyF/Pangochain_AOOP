import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "sample-data", "case-documents");

const documents = [
  {
    caseId: "chen-v-meridian",
    name: "Chen-Meridian Master Lease Agreement 2021",
    kind: "CONTRACT",
    text: `
MASTER COMMERCIAL LEASE AGREEMENT

Parties: Marcus Chen, tenant, and Meridian Holdings Ltd., landlord.
Premises: 12,500 square feet of warehouse and light assembly space at 1440 Alameda Street, Los Angeles.
Term: January 1, 2021 through December 31, 2026.

Section 8.2 - Termination Notice.
Landlord may not terminate the lease for alleged monetary default unless landlord gives tenant 90 days written notice and a clear itemized cure amount. Notice must be sent by certified mail and email to the tenant notice address.

Section 10.1 - Repairs.
Landlord is responsible for roof, HVAC, loading dock doors, and base building electrical systems. Tenant rent abatement applies when landlord repair delay materially interrupts warehouse operations for more than 72 hours.

Section 14.4 - Attorneys' Fees.
The prevailing party in any lease enforcement action is entitled to reasonable attorneys' fees and costs.

Case note for AI testing: Chen's strongest argument is that Meridian's January 18, 2024 default notice did not provide a correct cure amount and ignored the February wire transfer.
`,
  },
  {
    caseId: "chen-v-meridian",
    name: "Meridian Notice of Default 2024-01-18",
    kind: "NOTICE",
    text: `
NOTICE OF DEFAULT

Date: January 18, 2024.
From: Meridian Holdings Ltd.
To: Marcus Chen.

Meridian alleges unpaid rent, common area maintenance charges, and late fees totaling $119,240. The notice states that Chen must cure within 30 days or vacate the premises.

Attached ledger issue: The ledger lists December 2023 rent as unpaid, applies $18,500 in disputed late fees, and does not reflect Chen's February 2, 2024 wire transfer confirmation.

Internal review note: This notice appears inconsistent with lease section 8.2 because it gives 30 days instead of 90 days and does not itemize the disputed CAM charges.
`,
  },
  {
    caseId: "chen-v-meridian",
    name: "Draft Preliminary Injunction Motion",
    kind: "PLEADING",
    text: `
DRAFT PRELIMINARY INJUNCTION MOTION

Requested relief: Preserve Chen's access to the warehouse pending trial and prohibit Meridian from changing locks, terminating utilities, or interfering with shipments.

Factual basis:
1. Lease section 8.2 requires 90 days written notice before termination.
2. Meridian gave only 30 days in its January 18 notice.
3. Chen has evidence of a February 2 wire transfer that Meridian's ledger omits.
4. Chen estimates $485,000 in business interruption damages if warehouse access is lost.

Argument summary: Irreparable harm exists because the warehouse is configured for custom assembly work and replacement space cannot be secured before customer delivery deadlines.
`,
  },
  {
    caseId: "delgado-estate",
    name: "Roberto Delgado Last Will and Testament",
    kind: "ESTATE",
    text: `
LAST WILL AND TESTAMENT OF ROBERTO DELGADO

Executor: Sofia Delgado.
Beneficiaries: Sofia Delgado, Mateo Delgado, and Isabel Delgado.

Specific gifts:
- Family residence to Sofia Delgado.
- Brokerage account divided equally among the three beneficiaries.
- Art collection to be appraised before distribution.
- Family business shares subject to transfer restrictions in the shareholder agreement.

Probate issue for AI testing: Beneficiaries dispute the valuation of two paintings and whether the family business shares can be distributed before shareholder consent.
`,
  },
  {
    caseId: "delgado-estate",
    name: "Estate Asset Schedule Initial Inventory",
    kind: "FINANCIAL",
    text: `
ESTATE ASSET SCHEDULE - INITIAL INVENTORY

Residence: 841 Hillcrest Avenue, estimated value $925,000.
Brokerage account: estimated value $610,000.
Family business shares: estimated value $340,000, subject to transfer restrictions.
Art collection: preliminary estimate $175,000, with two disputed paintings requiring independent appraisal.
Vehicle and personal property: estimated value $38,500.

Filing note: The estate valuation hearing should focus on the independent appraisal timeline and whether business share transfer restrictions affect marketability discount.
`,
  },
  {
    caseId: "pinnacle-data-breach",
    name: "Pinnacle Security Incident Report Oct 2024",
    kind: "INCIDENT_REPORT",
    text: `
PINNACLE SECURITY INCIDENT REPORT

Incident date range: October 4, 2024 through October 9, 2024.
Attack vector: Credential stuffing against customer support accounts.
Records affected: Approximately 12,000 customer profiles, including names, emails, support ticket metadata, and partial account identifiers.

Containment steps:
- Disabled affected credentials.
- Forced password reset for support staff.
- Expanded MFA rollout.
- Preserved authentication logs for expert review.

Litigation note: Plaintiffs allege delayed notice. Defense position is that notice timing ran from confirmation of unauthorized access, not the first suspicious login alert.
`,
  },
];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wrap(text, width = 88) {
  const result = [];
  for (const raw of text.trim().split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      result.push("");
      continue;
    }
    let remaining = line;
    while (remaining.length > width) {
      let cut = remaining.lastIndexOf(" ", width);
      if (cut < 20) cut = width;
      result.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trimStart();
    }
    result.push(remaining);
  }
  return result;
}

function pdfEscape(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function makePdf(title, subtitle, body) {
  const lines = [title, subtitle, "", ...wrap(body)];
  const commands = ["BT", "/F1 11 Tf", "50 742 Td", "14 TL"];
  for (let index = 0; index < lines.length; index += 1) {
    if (index === 0) {
      commands.push("/F1 16 Tf", `(${pdfEscape(lines[index])}) Tj`, "/F1 11 Tf", "T*");
    } else {
      commands.push(`(${pdfEscape(lines[index])}) Tj`, "T*");
    }
  }
  commands.push("ET");
  const stream = Buffer.from(commands.join("\n"), "latin1");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream.toString("latin1")}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

await mkdir(out, { recursive: true });

for (const doc of documents) {
  const folder = resolve(out, doc.caseId);
  await mkdir(folder, { recursive: true });
  const base = slug(doc.name);
  const content = `${doc.name}\nCase: ${doc.caseId}\nCategory: ${doc.kind}\n\n${doc.text.trim()}\n`;
  await writeFile(resolve(folder, `${base}.txt`), content, "utf8");
  await writeFile(
    resolve(folder, `${base}.pdf`),
    makePdf(doc.name, `Case: ${doc.caseId} | Category: ${doc.kind}`, doc.text),
  );
}

console.log(`Wrote ${documents.length} text files and ${documents.length} PDFs to ${out}`);
