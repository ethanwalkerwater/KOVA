import { StatusBar } from "@/components/ui";

export default function MePage() {
  return (
    <div>
      <StatusBar />
      <div className="px-5 py-4">
        <h1 className="text-fg-primary font-bold text-2xl">Profile</h1>
        <p className="text-fg-muted text-sm mt-1">Your account</p>
      </div>
    </div>
  );
}
