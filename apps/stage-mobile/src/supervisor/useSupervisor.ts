import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { type SupervisorState, decodeState, initialState } from "./model";
const KEY = "stage.supervisor.v1";
export function useSupervisor() {
  const [state, setState] = useState<SupervisorState>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const current = useRef(state);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const loaded = raw ? decodeState(raw) : initialState();
        if (active) {
          current.current = loaded;
          setState(loaded);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar os dados locais. Feche e abra o Stage para tentar novamente; os dados foram preservados.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function commit(update: (value: SupervisorState) => SupervisorState) {
    if (!ready || lock.current) return false;
    lock.current = true;
    setSaving(true);
    try {
      const next = update(current.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      current.current = next;
      setState(next);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente.");
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return { state, commit, ready, saving, error };
}
