import { StatusBar } from "@/components/ui";

export default function ClientsPage() {
  return (
    <div>
      <StatusBar />
      <div className="px-5 py-4">
        <h1 className="text-fg-primary font-bold text-2xl">Clients</h1>
        <p className="text-fg-muted text-sm mt-1">Your contact list</p>
      </div>
    </div>
  );
}
