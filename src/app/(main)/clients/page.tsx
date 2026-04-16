import { mockContacts } from "@/lib/mock-data";
import { ClientsScreen } from "./ClientsScreen";

export default function ClientsPage() {
  return <ClientsScreen contacts={mockContacts} />;
}
