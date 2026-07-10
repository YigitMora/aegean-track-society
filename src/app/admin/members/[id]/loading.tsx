import { AdminLoadingState } from "@/components/admin/admin-loading-state";

export default function AdminMemberDetailLoading() {
  return (
    <AdminLoadingState eyebrow="Üye detayı" title="Üye detayı yükleniyor." rows={4} />
  );
}
