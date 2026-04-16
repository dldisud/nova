import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, isLoadingSession };
}
