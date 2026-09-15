import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { type OpsSnapshot, opsRequest } from "./client";
export function useOps() {
  const [data, setData] = useState<OpsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let inFlight = false;
      const refresh = async () => {
        if (inFlight || controller.signal.aborted) return;
        inFlight = true;
        setLoading(true);
        try {
          const next = await opsRequest<OpsSnapshot>("/api/ops", undefined, controller.signal);
          if (!controller.signal.aborted) {
            setData(next);
            setError(null);
          }
        } catch (e) {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : "Stage is offline.");
        } finally {
          inFlight = false;
          if (!controller.signal.aborted) setLoading(false);
        }
      };
      refreshRef.current = refresh;
      void refresh();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void refresh();
      }, 4000);
      const listener = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        controller.abort();
        clearInterval(timer);
        listener.remove();
      };
    }, []),
  );
  return { data, error, loading, refresh: () => refreshRef.current() };
}
