import { redirect } from "next/navigation";

export default function SuperadminPage() {
  redirect("/admin/superadmin/admins");
}
