import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation helpers for public (next-intl) surfaces. Use these Link/
// useRouter/redirect in app/[locale]/** so URLs keep their locale prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
