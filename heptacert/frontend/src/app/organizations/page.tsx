import { permanentRedirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function LegacyOrganizationsPage() {
  permanentRedirect(`/${routing.defaultLocale}/organizations`);
}
