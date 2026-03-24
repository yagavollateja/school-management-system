import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "faculty" | "student";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}

interface AuthState {
  user: import("@supabase/supabase-js").User | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: import("@supabase/supabase-js").User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      set({ profile: data as UserProfile });
    }
  },
}));
