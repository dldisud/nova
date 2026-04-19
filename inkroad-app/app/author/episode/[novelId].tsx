import { useLocalSearchParams } from "expo-router";

import EpisodeComposerScreen from "../../../src/mobile/screens/EpisodeComposerScreen";

export default function EpisodeComposerRoute() {
  const { novelId, episodeId } = useLocalSearchParams<{ novelId: string; episodeId?: string }>();

  return <EpisodeComposerScreen novelId={novelId ?? ""} episodeId={episodeId} />;
}
