import Link from "next/link";
import { createVehicleAction } from "@/app/account/garage/actions";
import { VehicleForm } from "@/components/vehicle-form";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { normalizeMemberReturnTo } from "@/lib/member-auth";

type NewVehiclePageProps = {
  searchParams: Promise<{
    garageError?: string;
    returnTo?: string;
  }>;
};

export default async function NewVehiclePage({ searchParams }: NewVehiclePageProps) {
  await requireCompleteMemberUser("/account/garage/new");
  const params = await searchParams;
  const returnTo = normalizeMemberReturnTo(params.returnTo);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <Link
          href="/account/garage"
          className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
        >
          ← Garaja dön
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Dijital garaj
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Araç ekle
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          İlk aktif aracınız otomatik olarak birincil araç olur. Sonraki
          araçlarda birincil tercihinizi ayrıca belirleyebilirsiniz.
        </p>
      </div>

      <VehicleErrorMessage garageError={params.garageError} />

      <VehicleForm
        action={createVehicleAction}
        submitLabel="Aracı Kaydet"
        showPrimaryOption
        returnTo={returnTo}
      />
    </section>
  );
}

function VehicleErrorMessage({ garageError }: { garageError?: string }) {
  const message = errorMessage(garageError);

  if (!message) {
    return null;
  }

  return (
    <p className="mb-5 rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
      {message}
    </p>
  );
}

function errorMessage(value?: string) {
  if (value === "duplicate_plate") {
    return "Bu plaka ile aktif bir araç garajınızda zaten bulunuyor.";
  }

  if (value === "invalid") {
    return "Lütfen marka, model, plaka ve opsiyonel alanları kontrol edin.";
  }

  if (value) {
    return "Araç eklenemedi. Lütfen tekrar deneyin.";
  }

  return null;
}
