import { getMockContact } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import { ContactDetailScreen } from "./ContactDetailScreen";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = getMockContact(id);
  if (!contact) notFound();
  return <ContactDetailScreen contact={contact} />;
}
