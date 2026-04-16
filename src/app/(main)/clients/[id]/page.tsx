export default function ContactDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="px-5 py-4">
      <p className="text-fg-muted text-sm">Contact ID: {params.id}</p>
    </div>
  );
}
