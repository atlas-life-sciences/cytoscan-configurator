import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { calcTotal } from "../../lib/price";

const payloadSchema = z.object({
  // Existing minimal fields
  name: z.string().min(2),
  institution: z.string().min(2),
  email: z.string().email(),
  country: z.string().min(2),
  vatId: z.string().optional().nullable(),
  samples: z.number().int().positive(),
  dnaIsolation: z.boolean(),
  quickStart: z.boolean(),

  // Added fields (mirroring your Google Form)
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),

  // Billing
  billingName: z.string().min(2),
  billingEmail: z.string().email(),
  billingAddress: z.string().min(5),
  poRef: z.string().optional().nullable(),

  // Order meta
  useCase: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

  // Sample type + details
  sampleType: z.enum(["dna", "pellet", "other"]),
  dna: z.object({
    concentrationNgPerUl: z.string().optional().nullable(),
    volumeUl: z.string().optional().nullable(),
    buffer: z.string().optional().nullable(),
    purityRatios: z.string().optional().nullable()
  }).optional().nullable(),
  pellet: z.object({
    cellsPerSampleMillion: z.string().optional().nullable()
  }).optional().nullable(),

  // QC and deliverables
  qcFallback: z.enum(["proceed", "replace", "contact"]),
  deliverables: z.array(z.enum(["CEL","ARR","QC","CYCHP","SEGMENT"])).min(1),

  // Legal/commercial
  acceptedLegal: z.boolean(),
  commercialBasis: z.enum(["have-quote","need-quote"]),
  comments: z.string().optional().nullable()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const data = payloadSchema.parse(req.body);
    if (!data.acceptedLegal) throw new Error("Legal terms must be accepted.");

    // Load pricing config (single-service config as you already have)
    const cfgPath = path.join(process.cwd(), "public", "service-config.karyo.json");
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

    const pricing = calcTotal(cfg, {
      samples: data.samples,
      dnaIsolation: data.dnaIsolation,
      quickStart: data.quickStart
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: false,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
    });

    const subject = `Request for Quote -- CytoScan 750K (RUO) -- ${data.institution}`;
    const dlv = data.deliverables.join(", ");

    const html = `
      <p>Dear ${data.name},</p>
      <p>Thank you for your request. Here is a summary:</p>
      <ul>
        <li><b>Institution:</b> ${data.institution}${data.department ? " -- " + data.department : ""}</li>
        <li><b>Contact:</b> ${data.email}${data.phone ? " | " + data.phone : ""}</li>
        <li><b>Country:</b> ${data.country}${data.vatId ? " (" + data.vatId + ")" : ""}</li>
        <li><b>Billing:</b> ${data.billingName}, ${data.billingEmail}, ${data.billingAddress}${data.poRef ? " | PO/Cost center: " + data.poRef : ""}</li>
        <li><b>Service:</b> CytoScan 750K (RUO)</li>
        <li><b>Samples:</b> ${data.samples}</li>
        <li><b>DNA isolation:</b> ${data.dnaIsolation ? "Yes" : "No"}</li>
        <li><b>Quick Start:</b> ${data.quickStart ? "Yes" : "No"}</li>
        <li><b>Sample type:</b> ${data.sampleType}</li>
        ${data.sampleType === "dna" ? `<li><b>DNA:</b> ${data.dna?.concentrationNgPerUl || "n/a"} ng/µL, ${data.dna?.volumeUl || "n/a"} µL, buffer ${data.dna?.buffer || "n/a"}, purity ${data.dna?.purityRatios || "n/a"}</li>` : ""}
        ${data.sampleType === "pellet" ? `<li><b>Cells/sample (×10^6):</b> ${data.pellet?.cellsPerSampleMillion || "n/a"}</li>` : ""}
        <li><b>QC handling:</b> ${data.qcFallback}</li>
        <li><b>Deliverables:</b> ${dlv}</li>
        <li><b>Use case:</b> ${data.useCase || "—"}</li>
        <li><b>Notes:</b> ${data.notes || "—"}</li>
        <li><b>Commercial basis:</b> ${data.commercialBasis === "have-quote" ? "Have valid quote/pricelist" : "Need a formal quote"}</li>
        <li><b>Comments:</b> ${data.comments || "—"}</li>
      </ul>
      <p><b>Estimated total:</b> ${pricing.total.toFixed(2)} ${pricing.currency}</p>
      <p>${cfg.ackTexts.ruo}<br/>${cfg.ackTexts.tat}</p>
      <p>We will follow up promptly with a formal quotation and next steps.</p>
      <p>Best regards,<br/>Atlas Biolabs</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM!,
      to: data.email,
      bcc: process.env.EMAIL_SUPPORT!,
      subject,
      html
    });

    return res.status(200).json({ ok: true, total: pricing.total, currency: pricing.currency });
  } catch (e: any) {
    console.error(e);
    return res.status(400).json({ ok: false, error: e.message });
  }
}
