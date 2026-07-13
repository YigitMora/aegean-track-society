export function AdminPermissionBanner({ code }: { code?: string }) {
  if (!code) {
    return null;
  }

  const message = messageForAdminPermissionCode(code);

  if (!message) {
    return null;
  }

  return (
    <section className="mb-6 rounded-lg border border-kerb/40 bg-kerb/10 p-4 text-red-100">
      <p className="text-sm font-black uppercase">{message.title}</p>
      <p className="mt-2 text-sm font-semibold text-white/75">{message.body}</p>
    </section>
  );
}

function messageForAdminPermissionCode(code: string) {
  if (code === "permission_denied" || code === "admin_permission_denied") {
    return {
      title: "Yetki reddedildi",
      body: "Bu işlem için gerekli yönetim yetkiniz bulunmuyor.",
    };
  }

  return null;
}
