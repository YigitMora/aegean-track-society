import type { AdminRole, MemberStatus } from "@prisma/client";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOwnerAdmin } from "@/lib/admin-authorization";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import {
  assignAdminRoleAction,
  changeAdminRoleAction,
  revokeAdminAccessAction,
} from "./actions";

const maxSearchLength = 100;

type AdminTeamPageProps = {
  searchParams: Promise<{
    q?: string;
    teamResult?: string;
    teamError?: string;
  }>;
};

type LinkedMember = {
  id: string;
  email: string;
  status: MemberStatus;
  deletedAt: Date | null;
  memberKvkkAcceptedAt: Date | null;
  memberTermsAcceptedAt: Date | null;
  profile: {
    fullName: string | null;
    phone: string | null;
  } | null;
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({ searchParams }: AdminTeamPageProps) {
  await requireOwnerAdmin();

  const params = await searchParams;
  const query = normalizeSearch(params.q);
  const adminUsers = await prisma.adminUser.findMany({
    orderBy: [
      {
        role: "asc",
      },
      {
        email: "asc",
      },
    ],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const adminEmails = adminUsers.map((adminUser) => adminUser.email);
  const linkedMembers = adminEmails.length
    ? await prisma.user.findMany({
        where: {
          email: {
            in: adminEmails,
          },
        },
        select: memberSelect,
      })
    : [];
  const memberSearchResults = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { profile: { is: { fullName: { contains: query, mode: "insensitive" } } } },
              { profile: { is: { phone: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: 20,
    select: memberSelect,
  });
  const memberByEmail = new Map(linkedMembers.map((member) => [member.email, member]));
  const adminByEmail = new Map(adminUsers.map((adminUser) => [adminUser.email, adminUser]));

  return (
    <AdminShell
      title="Ekip ve Yetkiler"
      eyebrow="Admin team"
      actions={
        <Link
          href="/admin"
          className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Dashboard
        </Link>
      }
    >
      <TeamMessage result={params.teamResult} error={params.teamError} />

      <section className="grid gap-4">
        <SectionHeader
          title="Mevcut yönetim ekibi"
          detail="Sistem sahibi korunur; yardımcı roller mevcut ATS üyelikleriyle giriş yapar."
        />
        <div className="grid gap-4">
          {adminUsers.map((adminUser) => (
            <AdminTeamCard
              key={adminUser.id}
              adminUser={adminUser}
              linkedMember={memberByEmail.get(adminUser.email) ?? null}
            />
          ))}
          {adminUsers.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/60">
              Henüz admin kaydı bulunmuyor.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="ATS üyesi seç"
          detail="Yetki verme formu yalnızca mevcut ve aktif ATS üyelerini kabul eder."
        />
        <form
          action="/admin/team"
          method="get"
          className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-white/10 p-4 md:grid-cols-[1fr_auto_auto]"
        >
          <label className="block">
            <span className="text-xs font-black uppercase text-white/50">
              Üye ara
            </span>
            <input
              name="q"
              defaultValue={query}
              maxLength={maxSearchLength}
              placeholder="Ad, e-posta veya telefon"
              className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
            />
          </label>
          <button
            type="submit"
            className="h-11 self-end rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
          >
            Ara
          </button>
          <Link
            href="/admin/team"
            className="inline-flex h-11 items-center justify-center self-end rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Temizle
          </Link>
        </form>

        <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
                <tr>
                  <th className="px-5 py-3">Üye</th>
                  <th className="px-5 py-3">E-posta</th>
                  <th className="px-5 py-3">Hesap</th>
                  <th className="px-5 py-3">Profil</th>
                  <th className="px-5 py-3">Mevcut yetki</th>
                  <th className="px-5 py-3">Yetki ver / güncelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {memberSearchResults.map((member) => (
                  <MemberSelectionRow
                    key={member.id}
                    member={member}
                    adminUser={adminByEmail.get(member.email) ?? null}
                  />
                ))}
                {memberSearchResults.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-white/60" colSpan={6}>
                      Eşleşen aktif üye bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

const memberSelect = {
  id: true,
  email: true,
  status: true,
  deletedAt: true,
  memberKvkkAcceptedAt: true,
  memberTermsAcceptedAt: true,
  profile: {
    select: {
      fullName: true,
      phone: true,
    },
  },
} as const;

function AdminTeamCard({
  adminUser,
  linkedMember,
}: {
  adminUser: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    createdAt: Date;
    updatedAt: Date;
  };
  linkedMember: LinkedMember | null;
}) {
  const isOwner = adminUser.role === "OWNER";

  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">
                {linkedMember?.profile?.fullName ?? adminUser.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/60">{adminUser.email}</p>
            </div>
            <RoleBadge role={adminUser.role} />
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Rol etiketi" value={roleLabel(adminUser.role)} />
            <Detail label="Yetki özeti" value={permissionSummary(adminUser.role)} />
            <Detail label="Giriş yöntemi" value={authExpectation(adminUser.role)} />
            <Detail
              label="ATS üye durumu"
              value={linkedMember ? memberStatusLabel(linkedMember) : "Üye bağlantısı yok"}
            />
            <Detail label="Oluşturma" value={adminUser.createdAt.toLocaleDateString("tr-TR")} />
            <Detail label="Güncelleme" value={adminUser.updatedAt.toLocaleDateString("tr-TR")} />
          </dl>
          {isOwner ? (
            <p className="mt-4 rounded-md border border-signal/30 bg-signal/10 p-3 text-sm font-black text-signal">
              Sistem Sahibi hesabı korunmaktadır.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {isOwner ? null : (
            <form
              action={changeAdminRoleAction.bind(null, adminUser.id)}
              className="rounded-md border border-white/10 bg-asphalt p-4"
            >
              <label className="block">
                <span className="text-xs font-black uppercase text-white/50">Rol</span>
                <select
                  name="role"
                  defaultValue={adminUser.role}
                  className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
                >
                  <option value="STAFF">Yardımcı Admin</option>
                  <option value="CHECKIN">Check-in Operatörü</option>
                </select>
              </label>
              <button
                type="submit"
                className="mt-3 h-11 w-full rounded-full bg-white px-5 text-sm font-black text-asphalt transition hover:bg-signal"
              >
                Rolü güncelle
              </button>
            </form>
          )}

          {isOwner ? null : (
            <form
              action={revokeAdminAccessAction.bind(null, adminUser.id)}
              className="rounded-md border border-kerb/30 bg-kerb/10 p-4"
            >
              <label className="block">
                <span className="text-xs font-black uppercase text-white/60">
                  Revokasyon onayı
                </span>
                <input
                  name="confirmation"
                  placeholder={adminUser.email}
                  className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
                />
              </label>
              <button
                type="submit"
                className="mt-3 h-11 w-full rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
              >
                Yetkiyi kaldır
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function MemberSelectionRow({
  member,
  adminUser,
}: {
  member: LinkedMember;
  adminUser: { id: string; role: AdminRole } | null;
}) {
  const isOwner = adminUser?.role === "OWNER";

  return (
    <tr className="align-top transition hover:bg-white/5">
      <td className="px-5 py-4">
        <p className="font-black text-white">{member.profile?.fullName ?? "İsimsiz üye"}</p>
        <p className="mt-1 text-xs font-semibold text-white/45">
          {member.profile?.phone ?? "-"}
        </p>
      </td>
      <td className="px-5 py-4 text-white/70">{member.email}</td>
      <td className="px-5 py-4">
        <span className="inline-flex rounded-full border border-white/10 bg-asphalt px-3 py-1 text-xs font-black uppercase text-white/65">
          {memberStatusLabel(member)}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex rounded-full border border-white/10 bg-asphalt px-3 py-1 text-xs font-black uppercase text-white/65">
          {isMemberProfileComplete(member) ? "Tamamlandı" : "Eksik"}
        </span>
      </td>
      <td className="px-5 py-4">
        {adminUser ? <RoleBadge role={adminUser.role} /> : "-"}
        {isOwner ? (
          <p className="mt-2 text-xs font-black text-signal">
            Sistem Sahibi hesabı korunmaktadır.
          </p>
        ) : null}
      </td>
      <td className="px-5 py-4">
        {isOwner ? (
          <span className="text-sm font-semibold text-white/45">Korumalı</span>
        ) : (
          <form action={assignAdminRoleAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="userId" value={member.id} />
            <select
              name="role"
              defaultValue={adminUser?.role === "CHECKIN" ? "CHECKIN" : "STAFF"}
              className="h-10 rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
            >
              <option value="STAFF">Yardımcı Admin</option>
              <option value="CHECKIN">Check-in Operatörü</option>
            </select>
            <button
              type="submit"
              className="h-10 rounded-full bg-white px-4 text-xs font-black text-asphalt transition hover:bg-signal"
            >
              Kaydet
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

function TeamMessage({ result, error }: { result?: string; error?: string }) {
  const message = error ? teamErrorMessage(error) : result ? teamResultMessage(result) : null;

  if (!message) {
    return null;
  }

  const toneClass =
    message.tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : message.tone === "warning"
        ? "border-signal/40 bg-signal/10 text-signal"
        : "border-kerb/40 bg-kerb/10 text-red-100";

  return (
    <section className={`mb-6 rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm font-black uppercase">{message.title}</p>
      <p className="mt-2 text-sm font-semibold text-white/75">{message.body}</p>
    </section>
  );
}

function teamResultMessage(result: string) {
  const messages: Record<string, { tone: "success"; title: string; body: string }> = {
    granted: {
      tone: "success",
      title: "Yetki verildi",
      body: "Seçili ATS üyesi artık kısıtlı admin erişimine sahip.",
    },
    changed: {
      tone: "success",
      title: "Rol güncellendi",
      body: "Admin rolü bir sonraki korumalı istekte yeni yetkilerle çözülecek.",
    },
    revoked: {
      tone: "success",
      title: "Yetki kaldırıldı",
      body: "ATS üyeliği korunur; yönetim erişimi bir sonraki istekte kaybolur.",
    },
  };

  return messages[result] ?? null;
}

function teamErrorMessage(error: string) {
  const messages: Record<string, { tone: "warning" | "danger"; title: string; body: string }> = {
    member_not_found: {
      tone: "danger",
      title: "Üye bulunamadı",
      body: "Yetki yalnızca mevcut ve aktif ATS üyelerine verilebilir.",
    },
    admin_already_assigned: {
      tone: "warning",
      title: "Rol zaten atanmış",
      body: "Bu üye seçilen yönetim rolüne zaten sahip.",
    },
    invalid_role: {
      tone: "danger",
      title: "Geçersiz rol",
      body: "Bu form yalnızca Yardımcı Admin veya Check-in Operatörü rolü atayabilir.",
    },
    owner_protected: {
      tone: "danger",
      title: "Sistem sahibi korunuyor",
      body: "Sistem Sahibi hesabı bu sayfadan değiştirilemez veya kaldırılamaz.",
    },
    admin_permission_denied: {
      tone: "danger",
      title: "Yetki reddedildi",
      body: "Bu işlem yalnızca Sistem Sahibi oturumuyla yapılabilir.",
    },
    member_admin_not_assigned: {
      tone: "danger",
      title: "Admin kaydı bulunamadı",
      body: "Seçili yönetim kaydı artık mevcut değil.",
    },
    confirmation_required: {
      tone: "danger",
      title: "Onay gerekli",
      body: "Yetki kaldırmak için admin e-posta adresini aynen yazın.",
    },
    failed: {
      tone: "danger",
      title: "İşlem tamamlanamadı",
      body: "Yönetim yetkisi güncellenemedi. Lütfen tekrar deneyin.",
    },
  };

  return messages[error] ?? messages.failed;
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-black uppercase text-signal">{title}</p>
      <p className="mt-2 text-sm font-semibold text-white/55">{detail}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-white/45">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  const className =
    role === "OWNER"
      ? "border-signal/40 bg-signal/10 text-signal"
      : role === "STAFF"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
        : "border-white/15 bg-asphalt text-white/75";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${className}`}>
      {roleLabel(role)}
    </span>
  );
}

function roleLabel(role: AdminRole) {
  if (role === "OWNER") {
    return "Sistem Sahibi";
  }

  if (role === "STAFF") {
    return "Yardımcı Admin";
  }

  return "Check-in Operatörü";
}

function permissionSummary(role: AdminRole) {
  if (role === "OWNER") {
    return "Tüm sistem yetkileri";
  }

  if (role === "STAFF") {
    return "Üyeler, katılımcılar ve check-in";
  }

  return "Katılımcılar ve check-in";
}

function authExpectation(role: AdminRole) {
  return role === "OWNER" ? "Sistem sahibi girişi" : "ATS üyelik girişi";
}

function memberStatusLabel(member: Pick<LinkedMember, "status" | "deletedAt">) {
  if (member.deletedAt) {
    return "Silinmiş";
  }

  return member.status === "ACTIVE" ? "Aktif" : "Askıda";
}

function normalizeSearch(value?: string) {
  return value?.trim().slice(0, maxSearchLength) ?? "";
}
