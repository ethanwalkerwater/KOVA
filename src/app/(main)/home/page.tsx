import { StatusBar } from "@/components/ui";

export default function HomePage() {
  return (
    <div>
      <StatusBar />
      <div className="px-5 py-4">
        <h1 className="text-fg-primary font-bold text-2xl">New Chat</h1>
        <p className="text-fg-muted text-sm mt-1">Capture a new contact</p>
      </div>
    </div>
  );
}
