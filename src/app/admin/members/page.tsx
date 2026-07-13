import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/admin-format";
import { adminHasCapability, requireAdminCapability } from "@/lib/admin-authorization";
import {
  MAX_ACTIVE_GARAGE_VEHICLES,
  MAX_ARCHIVED_GARAGE_VEHICLES,
} from "@/lib/garage-capacity";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";

const pageSize = 25;
const maxQueryLength = 100;
const statusFilters = ["all", "ACTIVE", "SUSPENDED"] as const;
const profileFilters = ["all", "complete", "incomplete"] as const;
const marketingFilters = ["all", "active", "inactive"] as const;
const sortOptions = ["newest", "oldest", "name"] as const;

type StatusFilter = (typeof statusFilters)[number];
type ProfileFilter = (typeof profileFilters)[number];
type MarketingFilter = (typeof marketingFilters)[number];
type SortOption = (typeof sortOptions)[number];

type MemberListRow = {
  id: string;
  email: string;
  status: string;
  createdAt?: Date;
  memberKvkkAcceptedAt: Date | null;
  memberTermsAcceptedAt: Date | null;
  profile: {
    fullName: string | null;
    displayName?: string | null;
    phone: string | null;
  } | null;
  vehicles?: Array<{
    deletedAt: Date | null;
  }>;
  registrations?: Array<{
    status: string;
    event: {
      name: string;
    };
  }>;
  _count: {
    registrations: number;
  };
};

type MembersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    profile?: string;
    marketing?: string;
    sort?: string;
    page?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({ searchParams }: MembersPageProps) {
  const adminActor = await requireAdminCapability("members.read");
  const canViewGarageData = adminHasCapability(adminActor.role, "garages.manage");

  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const status = isStatusFilter(params.status) ? params.status : "all";
  const profile = isProfileFilter(params.profile) ? params.profile : "all";
  const marketing =
    canViewGarageData && isMarketingFilter(params.marketing) ? params.marketing : "all";
  const sort = isSortOption(params.sort) ? params.sort : "newest";
  const page = normalizePage(params.page);
  const where = buildMemberWhere({
    query,
    status,
    profile,
    marketing,
    includeMarketingFilter: canViewGarageData,
    includeVehicleSearch: canViewGarageData,
  });
  const orderBy = orderByForSort(sort);
  const skip = (page - 1) * pageSize;
  const memberSelect: Prisma.UserSelect = {
    id: true,
    email: true,
    status: true,
    memberKvkkAcceptedAt: true,
    memberTermsAcceptedAt: true,
    profile: {
      select: {
        fullName: true,
        phone: true,
      },
    },
    _count: {
      select: {
        registrations: {
          where: {
            deletedAt: null,
          },
        },
      },
    },
  };

  if (canViewGarageData) {
    memberSelect.role = true;
    memberSelect.memberMarketingConsentAt = true;
    memberSelect.memberMarketingConsentRevokedAt = true;
    memberSelect.createdAt = true;
    memberSelect.profile = {
      select: {
        fullName: true,
        displayName: true,
        phone: true,
      },
    };
    memberSelect.vehicles = {
      select: {
        deletedAt: true,
      },
    };
  } else {
    memberSelect.registrations = {
      where: {
        deletedAt: null,
        event: {
          status: {
            in: ["PUBLISHED", "SOLD_OUT"],
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "asc",
        },
      ],
      take: 1,
      select: {
        status: true,
        event: {
          select: {
            name: true,
          },
        },
      },
    };
  }

  const [totalMembers, members] = (await measureServerTiming("ADMIN_MEMBERS_QUERY", () =>
    prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: memberSelect,
      }),
    ]),
  )) as unknown as [number, MemberListRow[]];

  const totalPages = Math.max(Math.ceil(totalMembers / pageSize), 1);
  const startRow = totalMembers === 0 ? 0 : skip + 1;
  const endRow = Math.min(skip + members.length, totalMembers);

  return (
    <AdminShell
      title="Üyeler"
      eyebrow="Members CRM"
      actions={
        canViewGarageData ? (
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Dashboard
          </Link>
        ) : null
      }
    >
      <form
        action="/admin/members"
        method="get"
        className={`grid gap-3 rounded-lg border border-white/10 bg-white/10 p-4 ${
          canViewGarageData
            ? "lg:grid-cols-[1fr_150px_150px_150px_150px_auto_auto]"
            : "lg:grid-cols-[1fr_150px_150px_150px_auto_auto]"
        }`}
      >
        <label className="block">
          <span className="text-xs font-black uppercase text-white/50">Üye ara</span>
          <input
            name="q"
            defaultValue={query}
            maxLength={maxQueryLength}
            placeholder={
              canViewGarageData ? "E-posta, ad, telefon veya plaka" : "E-posta, ad veya telefon"
            }
            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
          />
        </label>
        <FilterSelect
          label="Hesap durumu"
          name="status"
          value={status}
          options={[
            ["all", "Tümü"],
            ["ACTIVE", "Aktif"],
            ["SUSPENDED", "Askıda"],
          ]}
        />
        <FilterSelect
          label="Profil durumu"
          name="profile"
          value={profile}
          options={[
            ["all", "Tümü"],
            ["complete", "Tamamlandı"],
            ["incomplete", "Eksik"],
          ]}
        />
        {canViewGarageData ? (
          <FilterSelect
            label="Pazarlama izni"
            name="marketing"
            value={marketing}
            options={[
              ["all", "Tümü"],
              ["active", "Açık"],
              ["inactive", "Kapalı"],
            ]}
          />
        ) : null}
        <FilterSelect
          label="Sıralama"
          name="sort"
          value={sort}
          options={[
            ["newest", "Yeni"],
            ["oldest", "Eski"],
            ["name", "Ad"],
          ]}
        />
        <button
          type="submit"
          className="h-11 self-end rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
        >
          Filtrele
        </button>
        <Link
          href="/admin/members"
          className="inline-flex h-11 items-center justify-center self-end rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Temizle
        </Link>
      </form>

      <section className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/10">
        <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black uppercase text-signal">
            {totalMembers} üye · {startRow}-{endRow}
          </p>
          <p className="text-xs font-semibold text-white/45">
            Supabase auth metadata ve oturum bilgileri gösterilmez.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table
            className={`w-full text-left text-sm ${
              canViewGarageData ? "min-w-[1080px]" : "min-w-[900px]"
            }`}
          >
            <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
              <tr>
                <th className="px-5 py-3">Üye</th>
                <th className="px-5 py-3">E-posta</th>
                <th className="px-5 py-3">Telefon</th>
                <th className="px-5 py-3">Hesap</th>
                <th className="px-5 py-3">Profil</th>
                {canViewGarageData ? <th className="px-5 py-3">Garaj</th> : null}
                <th className="px-5 py-3">Başvurular</th>
                {canViewGarageData ? (
                  <th className="px-5 py-3">Üyelik tarihi</th>
                ) : (
                  <th className="px-5 py-3">Aktif etkinlik</th>
                )}
                <th className="px-5 py-3">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {members.map((member) => {
                const profileComplete = isMemberProfileComplete(member);
                const vehicles =
                  canViewGarageData && "vehicles" in member ? member.vehicles ?? [] : [];
                const activeEventRegistration =
                  !canViewGarageData && "registrations" in member
                    ? member.registrations?.[0] ?? null
                    : null;
                const activeVehicleCount = vehicles.filter((vehicle) => !vehicle.deletedAt).length;
                const archivedVehicleCount = vehicles.filter((vehicle) => vehicle.deletedAt).length;
                const capacityExceeded =
                  activeVehicleCount > MAX_ACTIVE_GARAGE_VEHICLES ||
                  archivedVehicleCount > MAX_ARCHIVED_GARAGE_VEHICLES;

                return (
                  <tr key={member.id} className="align-top transition hover:bg-white/5">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="font-black text-white transition hover:text-signal"
                      >
                        {member.profile?.fullName ?? "İsimsiz üye"}
                      </Link>
                      {canViewGarageData ? (
                        <p className="mt-1 text-xs font-semibold text-white/45">
                          {member.profile?.displayName
                            ? `Görünen ad: ${member.profile.displayName}`
                            : `ID: ${member.id}`}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-white/75">{member.email}</td>
                    <td className="px-5 py-4 text-white/75">
                      {member.profile?.phone ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <AccountStatusBadge status={member.status} />
                    </td>
                    <td className="px-5 py-4">
                      <ProfileStatusBadge complete={profileComplete} />
                    </td>
                    {canViewGarageData ? (
                      <td className="px-5 py-4">
                        <p className="font-black text-white">
                          {activeVehicleCount} / {MAX_ACTIVE_GARAGE_VEHICLES} aktif
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/55">
                          {archivedVehicleCount} / {MAX_ARCHIVED_GARAGE_VEHICLES} arşiv
                        </p>
                        {capacityExceeded ? (
                          <p className="mt-1 text-xs font-black uppercase text-signal">
                            Kapasite üstü
                          </p>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="px-5 py-4 font-black text-white">
                      {member._count.registrations}
                    </td>
                    {canViewGarageData ? (
                      <td className="px-5 py-4 text-white/65">
                        {formatDateTime(member.createdAt)}
                      </td>
                    ) : (
                      <td className="px-5 py-4 text-white/65">
                        {activeEventRegistration ? (
                          <>
                            <StatusBadge value={activeEventRegistration.status} />
                            <p className="mt-2 text-xs font-semibold text-white/45">
                              {activeEventRegistration.event.name}
                            </p>
                          </>
                        ) : (
                          "Yok"
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="font-black text-signal transition hover:text-white"
                      >
                        Aç
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-white/60" colSpan={canViewGarageData ? 9 : 8}>
                    Geçerli arama ve filtrelerle eşleşen üye bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/55">
          Sayfa {page} / {totalPages}
        </p>
        <div className="flex gap-3">
          <PaginationLink
            href={membersHref(params, { page: Math.max(page - 1, 1) })}
            disabled={page <= 1}
          >
            Önceki
          </PaginationLink>
          <PaginationLink
            href={membersHref(params, { page: Math.min(page + 1, totalPages) })}
            disabled={page >= totalPages}
          >
            Sonraki
          </PaginationLink>
        </div>
      </nav>
    </AdminShell>
  );
}

function buildMemberWhere({
  query,
  status,
  profile,
  marketing,
  includeMarketingFilter,
  includeVehicleSearch,
}: {
  query: string;
  status: StatusFilter;
  profile: ProfileFilter;
  marketing: MarketingFilter;
  includeMarketingFilter: boolean;
  includeVehicleSearch: boolean;
}): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };
  const andFilters: Prisma.UserWhereInput[] = [];

  if (status !== "all") {
    andFilters.push({ status });
  }

  if (profile === "complete") {
    andFilters.push(profileCompleteWhere());
  }

  if (profile === "incomplete") {
    andFilters.push({
      NOT: profileCompleteWhere(),
    });
  }

  if (includeMarketingFilter && marketing === "active") {
    andFilters.push({
      memberMarketingConsentAt: {
        not: null,
      },
      memberMarketingConsentRevokedAt: null,
    });
  }

  if (includeMarketingFilter && marketing === "inactive") {
    andFilters.push({
      OR: [
        {
          memberMarketingConsentAt: null,
        },
        {
          memberMarketingConsentRevokedAt: {
            not: null,
          },
        },
      ],
    });
  }

  if (query) {
    const searchFilters: Prisma.UserWhereInput[] = [
      { email: { contains: query, mode: "insensitive" } },
      { profile: { is: { fullName: { contains: query, mode: "insensitive" } } } },
      { profile: { is: { displayName: { contains: query, mode: "insensitive" } } } },
      { profile: { is: { phone: { contains: query, mode: "insensitive" } } } },
    ];

    if (includeVehicleSearch) {
      searchFilters.push({
        vehicles: { some: { plateNumber: { contains: query, mode: "insensitive" } } },
      });
    }

    andFilters.push({
      OR: searchFilters,
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

function profileCompleteWhere(): Prisma.UserWhereInput {
  return {
    memberKvkkAcceptedAt: {
      not: null,
    },
    memberTermsAcceptedAt: {
      not: null,
    },
    profile: {
      is: {
        fullName: {
          not: null,
        },
        phone: {
          not: null,
        },
      },
    },
  };
}

function orderByForSort(sort: SortOption): Prisma.UserOrderByWithRelationInput[] {
  if (sort === "oldest") {
    return [{ createdAt: "asc" }, { id: "asc" }];
  }

  if (sort === "name") {
    return [{ profile: { fullName: "asc" } }, { email: "asc" }, { id: "asc" }];
  }

  return [{ createdAt: "desc" }, { id: "asc" }];
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/50">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfileStatusBadge({ complete }: { complete: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        complete
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-signal/40 bg-signal/10 text-signal"
      }`}
    >
      {complete ? "Tamamlandı" : "Eksik"}
    </span>
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        isActive
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-kerb/40 bg-kerb/10 text-red-100"
      }`}
    >
      {isActive ? "Aktif" : "Askıda"}
    </span>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-11 items-center rounded-full border border-white/10 px-5 text-sm font-black text-white/25">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
    >
      {children}
    </Link>
  );
}

function membersHref(
  currentParams: Awaited<MembersPageProps["searchParams"]>,
  overrides: { page: number },
) {
  const params = new URLSearchParams();
  const query = normalizeQuery(currentParams.q);
  const status = isStatusFilter(currentParams.status) ? currentParams.status : "all";
  const profile = isProfileFilter(currentParams.profile) ? currentParams.profile : "all";
  const marketing = isMarketingFilter(currentParams.marketing)
    ? currentParams.marketing
    : "all";
  const sort = isSortOption(currentParams.sort) ? currentParams.sort : "newest";

  if (query) {
    params.set("q", query);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (profile !== "all") {
    params.set("profile", profile);
  }

  if (marketing !== "all") {
    params.set("marketing", marketing);
  }

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  if (overrides.page > 1) {
    params.set("page", String(overrides.page));
  }

  const search = params.toString();
  return search ? `/admin/members?${search}` : "/admin/members";
}

function normalizeQuery(value?: string) {
  return value?.trim().slice(0, maxQueryLength) ?? "";
}

function normalizePage(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function isStatusFilter(value?: string): value is StatusFilter {
  return Boolean(value && statusFilters.includes(value as StatusFilter));
}

function isProfileFilter(value?: string): value is ProfileFilter {
  return Boolean(value && profileFilters.includes(value as ProfileFilter));
}

function isMarketingFilter(value?: string): value is MarketingFilter {
  return Boolean(value && marketingFilters.includes(value as MarketingFilter));
}

function isSortOption(value?: string): value is SortOption {
  return Boolean(value && sortOptions.includes(value as SortOption));
}
