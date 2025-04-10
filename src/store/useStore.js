import { create } from "zustand";

export const useStore = create((set) => ({
  publicKey: null,
  privateKey: null,
  profile: null,
  setKeys: (publicKey, privateKey) => set({ publicKey, privateKey }),
  setProfile: (profile) => set({ profile }),
  logout: () => set({ publicKey: null, privateKey: null, profile: null }),
}));
