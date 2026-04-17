import { ContactDetailScreen } from "./ContactDetailScreen";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailScreen id={id} />;
}
