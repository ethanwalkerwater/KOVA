import { getMockFollowupSuggestions } from "@/lib/mock-data";
import { HomeScreen } from "./HomeScreen";

export default function HomePage() {
  const suggestions = getMockFollowupSuggestions();
  return <HomeScreen suggestions={suggestions} />;
}
