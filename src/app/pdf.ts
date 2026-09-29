/**
 * A ticket as a one-page PDF, drawn in the browser as the design draws it:
 * the venue's band, the show's lines, the ticket's QR code and its code.
 * Built by hand (no PDF library): the standard fonts carry Latin text only,
 * so a line the reader's language writes in another script is drawn with the
 * same line built in English (`readable`) — the whole line, its date, times,
 * age rule and status with it, never a shorter one — and the code and the QR
 * read the same in every language.
 */
import { qrMatrix } from "@adminiumjs/public-client/qr";

import { locale, setLocale } from "../i18n/tr.ts";

const WIN: Record<string, number> = { "—": 151, "–": 150, "·": 183, "•": 149, "’": 146, "‘": 145, "“": 147, "”": 148, "…": 133, "€": 128 };

const MARKS = /[\u2066-\u2069]/g;

/** Whether a line can be written in the standard fonts' encoding (the direction marks around figures are never drawn). */
export const latin = (s: string): boolean => [...s.replace(MARKS, "")].every((ch) => ch.charCodeAt(0) < 256 || ch in WIN);

function esc(s: string): string {
  let r = "";
  for (const ch of s.replace(MARKS, "")) {
    const c = ch.charCodeAt(0);
    if (ch === "(" || ch === ")" || ch === "\\") r += `\\${ch}`;
    else if (c < 128) r += ch;
    else if (WIN[ch] !== undefined) r += `\\${WIN[ch]!.toString(8).padStart(3, "0")}`;
    else if (c < 256) r += `\\${c.toString(8).padStart(3, "0")}`;
    else r += "?";
  }
  return r;
}

/** One line of the page: text, size, font (F1 regular, F2 bold, F3 mono) and grey. */
export type PdfLine = [string, number, "F1" | "F2" | "F3", string?];

/**
 * The page's lines as the standard fonts can draw them: `build` runs in the
 * reader's language, and again in English; each line the fonts cannot draw
 * in the reader's words is the English line in its place (same position,
 * same content). A line whose own data is in another script (a name) is
 * drawn as it is either way.
 */
export function readable(build: () => PdfLine[]): PdfLine[] {
  const own = build();
  if (own.every(([t]) => latin(t))) return own;
  const was = locale();
  let english: PdfLine[];
  try {
    setLocale("en-US");
    english = build();
  } finally {
    setLocale(was);
  }
  return own.map((l, i) => (latin(l[0]) ? l : (english[i] ?? l)));
}

export function ticketPdf(head: { venue: string; address: string }, lines: PdfLine[], code: string, foot: string): string {
  const W = 420;
  const H = 595;
  let c = `0.06 0.06 0.08 rg 0 ${String(H - 86)} ${String(W)} 86 re f\n`;
  const tx = (x: number, y: number, sz: number, f: string, s: string, g = "0.1 0.1 0.13") => {
    c += `BT /${f} ${String(sz)} Tf ${g} rg ${String(x)} ${String(y)} Td (${esc(s)}) Tj ET\n`;
  };
  tx(32, H - 42, 13, "F2", head.venue.toUpperCase(), "1 1 1");
  tx(32, H - 62, 9, "F1", head.address, "0.78 0.78 0.84");
  let y = H - 124;
  for (const [t, sz, f, g] of lines) {
    tx(32, y, sz, f, t, g);
    y -= sz + 10;
  }
  const m0 = qrMatrix(code.replace(/-/g, ""));
  const N = m0.length;
  const sz = 200;
  const m = sz / N;
  const qx = (W - sz) / 2;
  const qy = 96;
  const qz = 4 * m;
  c += `1 1 1 rg ${String(qx - qz)} ${String(qy - qz)} ${String(sz + 2 * qz)} ${String(sz + 2 * qz)} re f 0 0 0 rg\n`;
  for (let yy = 0; yy < N; yy += 1) for (let x = 0; x < N; x += 1) if (m0[yy]![x]) c += `${(qx + x * m).toFixed(2)} ${(qy + (N - 1 - yy) * m).toFixed(2)} ${m.toFixed(2)} ${m.toFixed(2)} re\n`;
  c += "f\n";
  tx((W - code.length * 10.2) / 2, 62, 17, "F3", code);
  tx(32, 30, 8.5, "F1", foot, "0.35 0.35 0.4");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${String(W)} ${String(H)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${String(c.length)} >>\nstream\n${c}endstream`,
  ];
  let out = "%PDF-1.4\n";
  const off: number[] = [];
  objs.forEach((o, i) => {
    off.push(out.length);
    out += `${String(i + 1)} 0 obj\n${o}\nendobj\n`;
  });
  const xr = out.length;
  out += `xref\n0 ${String(objs.length + 1)}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${String(objs.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xr)}\n%%EOF`;
  return out;
}

/** Saves the PDF in the browser; false when this browser cannot save a file. */
export function savePdf(pdf: string, name: string): boolean {
  try {
    const bytes = Uint8Array.from(pdf, (ch) => ch.charCodeAt(0) & 0xff);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
