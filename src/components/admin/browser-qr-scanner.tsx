"use client";

import { useEffect, useRef, useState } from "react";

type ScannerState = "idle" | "starting" | "scanning" | "unsupported" | "error";

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

export function BrowserQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<BarcodeDetectorConstructor> | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState("Use the camera button on a secure mobile browser.");

  useEffect(() => {
    return () => {
      stopScanner(false);
    };
  }, []);

  async function startScanner() {
    const barcodeWindow = window as WindowWithBarcodeDetector;

    if (!navigator.mediaDevices?.getUserMedia || !barcodeWindow.BarcodeDetector) {
      setState("unsupported");
      setMessage("Camera QR scanning is not available in this browser. Paste the QR URL instead.");
      return;
    }

    try {
      setState("starting");
      detectorRef.current = new barcodeWindow.BarcodeDetector({ formats: ["qr_code"] });
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      if (!videoRef.current) {
        return;
      }

      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      setState("scanning");
      setMessage("Point the camera at the participant QR code.");
      scanFrame();
    } catch {
      stopScanner();
      setState("error");
      setMessage("Camera permission was denied or the camera could not be started.");
    }
  }

  function stopScanner(resetState = true) {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (resetState) {
      setState("idle");
    }
  }

  async function scanFrame() {
    const detector = detectorRef.current;
    const video = videoRef.current;

    if (!detector || !video || !streamRef.current) {
      return;
    }

    try {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const barcodes = await detector.detect(video);
        const value = barcodes.find((barcode) => barcode.rawValue)?.rawValue;
        const token = value ? extractCheckInToken(value) : null;

        if (token) {
          stopScanner();
          window.location.assign(`/check-in/${encodeURIComponent(token)}`);
          return;
        }
      }
    } catch {
      // Keep scanning; transient detector errors are common while the camera settles.
    }

    animationRef.current = window.requestAnimationFrame(scanFrame);
  }

  const isActive = state === "starting" || state === "scanning";

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-black/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-white/45">Camera scanner</p>
          <p className="mt-1 text-sm font-semibold text-white/70">{message}</p>
        </div>
        <button
          type="button"
          onClick={isActive ? () => stopScanner() : startScanner}
          className="h-12 rounded-full bg-white px-5 text-sm font-black text-asphalt transition hover:bg-signal"
        >
          {isActive ? "Stop camera" : "Open camera"}
        </button>
      </div>

      <div className={`mt-4 overflow-hidden rounded-md border border-white/10 ${isActive ? "block" : "hidden"}`}>
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full bg-black object-cover"
          muted
          playsInline
        />
      </div>

      {state === "unsupported" || state === "error" ? (
        <p className="mt-3 rounded-md border border-signal/30 bg-signal/10 px-3 py-2 text-sm font-semibold text-signal">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function extractCheckInToken(value: string) {
  const trimmed = value.trim();
  const tokenFromUrl = extractTokenFromUrl(trimmed);
  const token = tokenFromUrl ?? trimmed;

  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    return null;
  }

  return token;
}

function extractTokenFromUrl(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length !== 2 || parts[0] !== "check-in") {
      return null;
    }

    return decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
}
