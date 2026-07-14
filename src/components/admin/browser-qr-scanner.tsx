"use client";

import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type ScannerState = "idle" | "starting" | "scanning" | "unsupported" | "error";

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorFactory = BarcodeDetectorConstructor & {
  getSupportedFormats?: () => Promise<string[]>;
};

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorFactory;
};

export function BrowserQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const detectorRef = useRef<InstanceType<BarcodeDetectorConstructor> | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState("Use the camera button on a secure mobile browser.");

  useEffect(() => {
    return () => {
      stopScanner(false);
    };
  }, []);

  async function startScanner() {
    const cameraSupportError = cameraSupportMessage();

    if (cameraSupportError) {
      setState("unsupported");
      setMessage(cameraSupportError);
      return;
    }

    try {
      setState("starting");
      setMessage("Starting camera...");
      const nativeDetector = await createNativeQrDetector();

      if (nativeDetector) {
        await startNativeScanner(nativeDetector);
        return;
      }

      await startJavaScriptScanner();
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

    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    detectorRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (resetState) {
      setState("idle");
    }
  }

  async function startNativeScanner(
    detector: InstanceType<BarcodeDetectorConstructor>,
  ) {
    detectorRef.current = detector;
    streamRef.current = await navigator.mediaDevices.getUserMedia(cameraConstraints());

    if (!videoRef.current) {
      stopScanner();
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    await videoRef.current.play();
    setState("scanning");
    setMessage("Point the camera at the participant QR code.");
    scanNativeFrame();
  }

  async function startJavaScriptScanner() {
    if (!videoRef.current) {
      return;
    }

    let BrowserQRCodeReader: typeof import("@zxing/browser").BrowserQRCodeReader;

    try {
      ({ BrowserQRCodeReader } = await import("@zxing/browser"));
    } catch {
      setState("unsupported");
      setMessage("Camera QR scanning is not available in this browser. Paste the QR URL instead.");
      return;
    }

    const codeReader = new BrowserQRCodeReader();
    const controls = await codeReader.decodeFromConstraints(
      cameraConstraints(),
      videoRef.current,
      (result, _error, activeControls) => {
        zxingControlsRef.current = activeControls;

        if (!result) {
          return;
        }

        handleScannedValue(result.getText());
      },
    );

    zxingControlsRef.current = controls;
    streamRef.current =
      videoRef.current.srcObject instanceof MediaStream
        ? videoRef.current.srcObject
        : null;
    setState("scanning");
    setMessage("Point the camera at the participant QR code.");
  }

  async function scanNativeFrame() {
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
          handleCheckInToken(token);
          return;
        }
      }
    } catch {
      // Keep scanning; transient detector errors are common while the camera settles.
    }

    animationRef.current = window.requestAnimationFrame(scanNativeFrame);
  }

  function handleScannedValue(value: string) {
    const token = extractCheckInToken(value);

    if (token) {
      handleCheckInToken(token);
    }
  }

  function handleCheckInToken(token: string) {
    stopScanner();
    window.location.assign(`/check-in/${encodeURIComponent(token)}`);
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
          disabled={state === "starting"}
          aria-busy={state === "starting"}
          className="h-12 rounded-full bg-white px-5 text-sm font-black text-asphalt transition hover:bg-signal disabled:cursor-wait disabled:bg-white/60"
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

function cameraSupportMessage() {
  if (!window.isSecureContext) {
    return "Camera scanning requires a secure HTTPS page. Paste the QR URL instead.";
  }

  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    return "Camera access is not available in this browser. Paste the QR URL instead.";
  }

  return null;
}

function cameraConstraints(): MediaStreamConstraints {
  return {
    video: {
      facingMode: {
        ideal: "environment",
      },
    },
    audio: false,
  };
}

async function createNativeQrDetector() {
  const BarcodeDetector = (window as WindowWithBarcodeDetector).BarcodeDetector;

  if (typeof BarcodeDetector !== "function") {
    return null;
  }

  if (typeof BarcodeDetector.getSupportedFormats === "function") {
    try {
      const formats = await BarcodeDetector.getSupportedFormats();

      if (!formats.includes("qr_code")) {
        return null;
      }
    } catch {
      return null;
    }
  }

  try {
    return new BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
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
