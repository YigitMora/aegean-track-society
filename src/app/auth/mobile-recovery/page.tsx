"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthMessage,
  AuthShell,
} from "@/components/auth/auth-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecoveryState = "idle" | "submitting" | "invalid" | "failed";

export default function MobileRecoveryPage() {
  const router = useRouter();
  const [state, setState] = useState<RecoveryState>("idle");
  const recoveryRef = useRef<ReturnType<typeof readRecoveryFragment>>(null);

  async function continueInBrowser() {
    const recovery = recoveryRef.current ?? readRecoveryFragment();
    if (!recovery) {
      setState("invalid");
      return;
    }

    recoveryRef.current = recovery;
    window.history.replaceState(null, "", window.location.pathname);
    setState("submitting");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp(recovery);
      if (error) {
        setState("invalid");
        return;
      }

      router.replace("/auth/reset-password");
    } catch {
      setState("failed");
    }
  }

  return (
    <AuthShell
      eyebrow="Şifre yenileme"
      title="Bağlantınızı güvenle açın."
      subtitle="Aegean Track Society uygulaması yüklüyse bu sayfa yerine uygulama açılır. Tarayıcıda devam etmek için aşağıdaki düğmeyi kullanın."
    >
      {state === "invalid" ? (
        <AuthMessage tone="error">
          Şifre yenileme bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.
        </AuthMessage>
      ) : null}
      {state === "failed" ? (
        <AuthMessage tone="error">
          Şifre yenileme bağlantısı şu anda doğrulanamadı. Lütfen tekrar deneyin.
        </AuthMessage>
      ) : null}
      <button
        type="button"
        disabled={state === "submitting"}
        onClick={continueInBrowser}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Tarayıcıda devam et
      </button>
    </AuthShell>
  );
}

function readRecoveryFragment() {
  if (typeof window === "undefined") {
    return null;
  }

  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const tokenHash = fragment.get("token_hash");
  const type = fragment.get("type");
  if (!tokenHash || type !== "recovery") {
    return null;
  }

  return {
    token_hash: tokenHash,
    type: "recovery" as const,
  };
}
