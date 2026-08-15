import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAppVersion, compareVersions } from "@/config/appVersion";

interface ForceUpdateState {
  needsUpdate: boolean;
  loading: boolean;
  currentVersion: string;
  minimumVersion: string;
  updateMessage: string;
}

export function useForceUpdate(): ForceUpdateState {
  const [state, setState] = useState<ForceUpdateState>({
    needsUpdate: false,
    loading: true,
    currentVersion: "",
    minimumVersion: "",
    updateMessage: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      if (!supabase) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      try {
        const currentVersion = await getAppVersion();

        const { data, error } = await supabase
          .from("app_versions")
          .select("minimum_version, update_message")
          .eq("platform", "android")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (cancelled) return;

        if (error || !data) {
          setState((s) => ({ ...s, loading: false, currentVersion }));
          return;
        }

        const needsUpdate =
          compareVersions(currentVersion, data.minimum_version) < 0;

        setState({
          needsUpdate,
          loading: false,
          currentVersion,
          minimumVersion: data.minimum_version,
          updateMessage: data.update_message || "",
        });
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false }));
        }
      }
    }

    checkVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
