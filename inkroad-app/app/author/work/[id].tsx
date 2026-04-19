import { useLocalSearchParams } from "expo-router";

import AuthorWorkScreen from "../../../src/mobile/screens/AuthorWorkScreen";

export default function AuthorWorkRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AuthorWorkScreen workId={id ?? ""} />;
}
