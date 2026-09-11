import { redirect } from "next/navigation";

// Archived with the retired LMS integration bridge. This file is not a live route.

export default function LmsBridgeRedirect() {
  redirect("/admin/lms/integrations");
}
