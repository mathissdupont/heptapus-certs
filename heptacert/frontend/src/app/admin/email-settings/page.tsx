import { redirect } from "next/navigation";

export default function EmailSettingsPage() {
  redirect("/admin/email-settings/smtp-config");
}
