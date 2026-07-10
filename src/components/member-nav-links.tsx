"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionState = "unknown" | "signed-out" | "signed-in";

export function MemberNavLinks() {
  const [sessionState, setSessionState] = useState<SessionState>("unknown");

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getUser().then(({ data, error }) => {
        if (mounted) {
          setSessionState(!error && data.user ? "signed-in" : "signed-out");
        }
      });

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSessionState(session?.user ? "signed-in" : "signed-out");
        }
      });

      return () => {
        mounted = false;
        subscription.subscription.unsubscribe();
      };
    } catch {
      setSessionState("signed-out");
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (sessionState === "signed-in") {
    return <MemberLink href="/account">Hesabım</MemberLink>;
  }

  return (
    <>
      <MemberLink href="/auth/login">Giriş Yap</MemberLink>
      <MemberLink href="/auth/sign-up">Üye Ol</MemberLink>
    </>
  );
}

function MemberLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="whitespace-nowrap transition hover:text-ats-blue">
      {children}
    </Link>
  );
}
