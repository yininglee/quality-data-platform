/// <reference types="vite/client" />

import { type QeAttachment } from "./assistant";

export type Fragment = { location: string; text: string };
type ReadResult = { fragments: Fragment[]; partial?: boolean };

function chunks(location: string, text: string): Fragment[] {
  const normalized = text.replace(/[ \t]+/g, " ").trim();
  const fragments: Fragment[] = [];
  for (let start = 0; start < normalized.length; start += 650) {
    fragments.push({ location, text: normalized.slice(start, start + 750) });
  }
  return fragments;
}

async function recognize(image: Blob | HTMLCanvasElement, signal: AbortSignal): Promise<string> {
  const { createWorker, OEM } = await import("tesseract.js");
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  const assets = new URL("qe-ocr/", base);
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  return new Promise<string>((resolve, reject) => {
    const abort = () => { void worker?.terminate(); reject(signal.reason); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    void createWorker("chi_sim+eng", OEM.LSTM_ONLY, {
      workerPath: new URL("worker.min.js", assets).href,
      corePath: new URL("core.wasm.js", assets).href,
      langPath: assets.href, workerBlobURL: false,
      errorHandler: (error) => reject(error),
    }).then(async (instance) => {
      worker = instance;
      signal.throwIfAborted();
      const result = await worker.recognize(image);
      return result.data.text;
    }).then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
      void worker?.terminate();
    });
  });
}

async function readPdf(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal): Promise<ReadResult> {
  const [pdf, { default: workerSrc }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdf.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdf.getDocument({ data: bytes, enableXfa: false, useSystemFonts: true });
  let destroyed = false;
  const destroy = async () => { if (!destroyed) { destroyed = true; await task.destroy(); } };
  const abort = () => { void destroy().catch(() => undefined); };
  signal.addEventListener("abort", abort, { once: true });
  const fragments: Fragment[] = [];
  try {
    signal.throwIfAborted();
    const doc = await task.promise;
    for (let num = 1; num <= doc.numPages; num++) {
      signal.throwIfAborted();
      const page = await doc.getPage(num);
      const content = await page.getTextContent();
      const text = content.items.map((part) => "str" in part ? part.str + (part.hasEOL ? "\n" : " ") : "").join("");
      if (text.trim()) {
        fragments.push(...chunks(`第 ${num} 页`, text));
      } else {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        if (canvas.width * canvas.height > 10_000_000) continue;
        await page.render({ canvas, viewport }).promise;
        fragments.push(...chunks(`第 ${num} 页（OCR）`, await recognize(canvas, signal)));
      }
    }
    return { fragments };
  } catch (error) {
    if (fragments.length) return { fragments, partial: true };
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    await destroy();
  }
}

async function readWord(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal): Promise<ReadResult> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  signal.throwIfAborted();
  if (!xml) return { fragments: [], partial: true };
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = [...doc.getElementsByTagNameNS(ns, "p")];
  return { fragments: paragraphs.flatMap((para, index) => chunks(`第 ${index + 1} 段`,
    [...para.getElementsByTagNameNS(ns, "t")].map((part) => part.textContent).join(""))) };
}

export async function readAttachment(attachment: QeAttachment, signal: AbortSignal): Promise<ReadResult> {
  const payload = attachment.dataUrl?.match(/^data:([^,;]*);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!payload || payload[2].length > 14_000_000) return { fragments: [], partial: true };
  const extension = attachment.name.split(".").pop()?.toLowerCase();
  const bytes = Uint8Array.from(atob(payload[2]), (char) => char.charCodeAt(0));
  signal.throwIfAborted();
  if (extension === "pdf") return readPdf(bytes, signal);
  if (extension === "docx") return readWord(bytes, signal);
  if (extension === "xlsx") {
    const { default: readExcel, readSheetNames } = await import("read-excel-file");
    const blob = new Blob([bytes]);
    const names = await readSheetNames(blob);
    const fragments: Fragment[] = [];
    for (const sheet of names) {
      signal.throwIfAborted();
      const rows = await readExcel(blob, { sheet, trim: false });
      fragments.push(...rows.flatMap((cells, index) => chunks(`${sheet} · 第 ${index + 1} 行`,
        cells.map((cell) => cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? "")).join(" | "))));
    }
    return { fragments };
  }
  if (["png", "jpg", "jpeg", "gif"].includes(extension ?? "")) {
    return { fragments: chunks("图像 OCR", await recognize(new Blob([bytes]), signal)) };
  }
  if (["txt", "csv"].includes(extension ?? "") || payload[1] === "text/plain") {
    return { fragments: chunks("文本内容", new TextDecoder().decode(bytes)) };
  }
  return { fragments: [], partial: true };
}
