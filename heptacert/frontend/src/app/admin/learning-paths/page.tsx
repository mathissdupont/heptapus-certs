import { redirect } from "next/navigation";

export default function LearningPathsRedirect() {
  redirect("/admin/lms/journeys");
}
