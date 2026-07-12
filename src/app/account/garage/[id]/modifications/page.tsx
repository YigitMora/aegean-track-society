import { redirect } from "next/navigation";

type VehicleModificationsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function VehicleModificationsPage({
  params,
}: VehicleModificationsPageProps) {
  const { id } = await params;

  redirect(`/account/garage/${id}#build-profile`);
}
