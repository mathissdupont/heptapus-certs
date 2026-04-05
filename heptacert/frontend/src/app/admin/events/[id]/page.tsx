import { redirect } from "next/navigation";

type EventIndexPageProps = {
  params: { id: string };
};

export default function EventIndexPage({ params }: EventIndexPageProps) {
  redirect(`/admin/events/${params.id}/certificates`);
}
