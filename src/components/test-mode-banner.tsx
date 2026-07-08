import { isIyzicoSandbox } from "@/lib/production-readiness";
import { isIyzicoPaymentEnabled } from "@/lib/payment-mode";

export function TestModeBanner() {
  if (!isIyzicoPaymentEnabled() || !isIyzicoSandbox()) {
    return null;
  }

  return (
    <div className="border-b border-signal/40 bg-signal px-4 py-2 text-center text-xs font-black uppercase text-asphalt">
      Test mode: iyzico sandbox is active. Do not treat payments as production.
    </div>
  );
}
