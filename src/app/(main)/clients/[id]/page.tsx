import { StatusBar } from "@/components/ui";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <StatusBar />
      <div className="px-5 py-4">
        <p className="text-fg-muted text-sm">Contact ID: {id}</p>
      </div>
    </div>
  );
}
