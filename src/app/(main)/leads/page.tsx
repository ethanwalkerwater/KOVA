import { StatusBar } from "@/components/ui";

export default function LeadsPage() {
  return (
    <div>
      <StatusBar />
      <div className="px-5 py-4">
        <h1 className="text-fg-primary font-bold text-2xl">Leads</h1>
        <p className="text-fg-muted text-sm mt-1">Discover new leads</p>
      </div>
    </div>
  );
}
