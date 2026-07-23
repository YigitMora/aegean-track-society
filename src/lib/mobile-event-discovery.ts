import { kulaEventSlug } from "@/lib/event-config";
import { kulaEventPresentation } from "@/lib/event-presentation";

export function getMobileEventDiscovery(slug: string) {
  return {
    data: {
      discovery: slug === kulaEventSlug ? kulaEventPresentation : null,
    },
  };
}
