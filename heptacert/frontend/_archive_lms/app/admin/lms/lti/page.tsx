import { redirect } from "next/navigation";

export default function LtiRedirect() {
  redirect("/admin/lms/integrations");
}
