import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Area {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
}

interface AreaContextValue {
  areas: Area[];
  selectedArea: Area | null;
  setSelectedArea: (a: Area | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "shehar.selectedAreaId";
const AreaContext = createContext<AreaContextValue | undefined>(undefined);

export const AreaProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedAreaState] = useState<Area | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("areas")
      .select("id,name,slug,sort_order,is_visible")
      .eq("is_visible", true)
      .order("sort_order");
    const list = (data ?? []) as Area[];
    setAreas(list);

    // Resolve selected: profile > localStorage > first
    let chosenId: string | null = null;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("selected_area_id")
        .eq("id", user.id)
        .maybeSingle();
      chosenId = (prof as any)?.selected_area_id ?? null;
    }
    if (!chosenId) chosenId = localStorage.getItem(STORAGE_KEY);
    const chosen = list.find((a) => a.id === chosenId) ?? list[0] ?? null;
    setSelectedAreaState(chosen);
    if (chosen) localStorage.setItem(STORAGE_KEY, chosen.id);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedArea = (a: Area | null) => {
    setSelectedAreaState(a);
    if (a) {
      localStorage.setItem(STORAGE_KEY, a.id);
      if (user) {
        supabase.from("profiles").update({ selected_area_id: a.id } as any).eq("id", user.id).then();
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AreaContext.Provider value={{ areas, selectedArea, setSelectedArea, loading, refresh }}>
      {children}
    </AreaContext.Provider>
  );
};

export const useArea = () => {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used within AreaProvider");
  return ctx;
};
