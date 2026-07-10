import { AccountLoadingState } from "@/components/account-loading-state";

export default function RegistrationsLoading() {
  return (
    <AccountLoadingState
      eyebrow="Üye alanı"
      title="Başvurularınız yükleniyor."
      cards={2}
    />
  );
}
