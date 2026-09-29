/**
 * The door's camera: the phone's back camera in a video, read for QR codes
 * several times a second. Where the browser reads QR codes itself
 * (`BarcodeDetector`), that; elsewhere a small reader loaded the first time
 * it is needed, so the rest of the staff screens never carry it.
 *
 * A QR on a ticket holds its code and nothing else; what the code is worth
 * is Adminium's to say.
 */

export type CameraProblem = "blocked" | "none";

export interface Scanner {
  stop(): void;
}

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/** The browser's own QR reader, when it has one that reads QR codes. */
async function nativeDetector(): Promise<Detector | null> {
  const Ctor = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (Ctor === undefined) return null;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ["qr_code"];
    return formats.includes("qr_code") ? new Ctor({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

/** The reader for browsers without one: a frame drawn to a canvas, its pixels read. */
async function canvasDetector(): Promise<Detector> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return {
    async detect(source) {
      const video = source as HTMLVideoElement;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (ctx === null || w === 0 || h === 0) return [];
      // A smaller frame reads as well and much faster: the code fills the middle of the picture.
      const scale = Math.min(1, 640 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      return hit === null ? [] : [{ rawValue: hit.data }];
    },
  };
}

/** Why the camera could not start, as the scan pad says it. */
export function problemOf(error: unknown): CameraProblem {
  const name = (error as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "none";
}

/**
 * Starts the back camera in `video` and calls `onCode` with each QR code it
 * reads (the same code again only after `quiet` ms, so one ticket held up is
 * one scan). Rejects with the camera's error when it cannot start.
 */
export async function startScanner(video: HTMLVideoElement, onCode: (text: string) => void, quiet = 2500): Promise<Scanner> {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (media?.getUserMedia === undefined) throw Object.assign(new Error("no camera"), { name: "NotFoundError" });
  const stream = await media.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  video.srcObject = stream;
  video.muted = true;
  video.setAttribute("playsinline", "");
  await video.play().catch(() => undefined);
  const detector = (await nativeDetector()) ?? (await canvasDetector());
  let stopped = false;
  let last = { text: "", at: 0 };
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = async () => {
    if (stopped) return;
    try {
      if (video.readyState >= 2) {
        const found = await detector.detect(video);
        const text = found[0]?.rawValue?.trim() ?? "";
        const now = Date.now();
        if (text !== "" && !(text === last.text && now - last.at < quiet)) {
          last = { text, at: now };
          onCode(text);
        } else if (text === last.text && text !== "") last.at = now;
      }
    } catch {
      // One unreadable frame: the next one is read.
    }
    if (!stopped) timer = setTimeout(() => void tick(), 180);
  };
  void tick();
  return {
    stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    },
  };
}
