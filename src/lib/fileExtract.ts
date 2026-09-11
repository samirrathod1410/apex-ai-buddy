import * as XLSX from "xlsx";
import mammoth from "mammoth";
import JSZip from "jszip";
import Papa from "papaparse";
import yaml from "js-yaml";

export type ExtractedFile = {
  name: string;
  size: number;
  kind: "text" | "image";
  /** Extracted text content (kind === "text") */
  text?: string;
  /** data URL (kind === "image") */
  dataUrl?: string;
  mime?: string;
  truncated?: boolean;
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_CHARS = 120_000; // keep well inside model context

const TEXT_EXT =
  /\.(txt|md|markdown|rtf|log|csv|tsv|json|xml|ya?ml|js|jsx|ts|tsx|py|java|c|h|cpp|hpp|cs|php|go|rs|rb|swift|kt|sql|html?|css|scss|sh|bash|ini|toml|env|conf)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|svg)$/i;

export function fileLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ext(name: string) {
  return (name.split(".").pop() || "").toLowerCase();
}

function clamp(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_CHARS) + "\n\n[... content truncated ...]", truncated: true };
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read the file."));
    fr.readAsDataURL(file);
  });
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str + (item.hasEOL ? "\n" : " ");
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(`--- Page ${i} ---\n${lines.join("\n").trim()}`);
    if (pages.join("\n").length > MAX_CHARS) break;
  }
  const out = pages.join("\n\n").trim();
  if (!out) throw new Error("No text found in this PDF — it may be a scanned image.");
  return out;
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  if (!value.trim()) throw new Error("No text found in this document.");
  return value.trim();
}

async function extractSheet(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    parts.push(`--- Sheet: ${sheetName} ---\n${csv.trim()}`);
  }
  const out = parts.join("\n\n").trim();
  if (!out) throw new Error("This workbook appears to be empty.");
  return out;
}

async function extractPptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)![1]);
      const nb = Number(b.match(/slide(\d+)\.xml/)![1]);
      return na - nb;
    });
  if (!slideFiles.length) throw new Error("No slides found in this presentation.");
  const out: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const text = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
      .map(m => m[1])
      .join(" ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    out.push(`--- Slide ${i + 1} ---\n${text}`);
  }
  return out.join("\n\n");
}

async function extractDelimited(file: File): Promise<string> {
  const raw = await file.text();
  const parsed = Papa.parse<string[]>(raw, { skipEmptyLines: true });
  if (parsed.errors.length && !parsed.data.length) throw new Error("Could not parse this file.");
  const rows = parsed.data as string[][];
  const [header, ...body] = rows;
  const lines = [
    `Columns: ${(header || []).join(" | ")}`,
    ...body.map((r, i) => `${i + 1}. ${r.join(" | ")}`),
  ];
  return `Rows: ${body.length}\n${lines.join("\n")}`;
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large (max ${fileLabel(MAX_FILE_BYTES)}).`);
  }
  if (file.size === 0) throw new Error(`${file.name} is empty.`);

  const e = ext(file.name);
  const base = { name: file.name, size: file.size, mime: file.type };

  if (IMAGE_EXT.test(file.name)) {
    if (e === "svg") {
      const { text, truncated } = clamp(await file.text());
      return { ...base, kind: "text", text, truncated };
    }
    return { ...base, kind: "image", dataUrl: await readAsDataUrl(file) };
  }

  let raw: string;
  try {
    if (e === "pdf") raw = await extractPdf(file);
    else if (e === "docx") raw = await extractDocx(file);
    else if (e === "doc")
      throw new Error("Legacy .doc files aren't supported — please save it as .docx or PDF.");
    else if (e === "xlsx" || e === "xls") raw = await extractSheet(file);
    else if (e === "pptx") raw = await extractPptx(file);
    else if (e === "ppt")
      throw new Error("Legacy .ppt files aren't supported — please save it as .pptx or PDF.");
    else if (e === "csv" || e === "tsv") raw = await extractDelimited(file);
    else if (e === "json") {
      const t = await file.text();
      try {
        raw = JSON.stringify(JSON.parse(t), null, 2);
      } catch {
        throw new Error("This JSON file is not valid JSON.");
      }
    } else if (e === "yaml" || e === "yml") {
      const t = await file.text();
      try {
        raw = JSON.stringify(yaml.load(t), null, 2);
      } catch {
        throw new Error("This YAML file could not be parsed.");
      }
    } else if (TEXT_EXT.test(file.name)) raw = await file.text();
    else throw new Error(`${file.name}: this file type isn't supported yet.`);
  } catch (err: any) {
    throw new Error(err?.message || `Could not read ${file.name}.`);
  }

  if (!raw.trim()) throw new Error(`No readable content found in ${file.name}.`);
  const { text, truncated } = clamp(raw);
  return { ...base, kind: "text", text, truncated };
}

export const ACCEPT_ATTR =
  ".pdf,.doc,.docx,.txt,.md,.markdown,.rtf,.csv,.tsv,.xls,.xlsx,.ppt,.pptx,.json,.xml,.yaml,.yml,.js,.jsx,.ts,.tsx,.py,.java,.c,.h,.cpp,.cs,.php,.go,.rs,.rb,.swift,.kt,.sql,.html,.htm,.css,.scss,.sh,.log,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg";
