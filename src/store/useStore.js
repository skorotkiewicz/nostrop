import { create } from 'zustand';

export const useStore = create((set) => ({
  publicKey: null,
  privateKey: null,
  profile: null,
  followedUsers: [],
  setKeys: (publicKey, privateKey) => set({ publicKey, privateKey }),
  setProfile: (profile) => set({ profile }),
  setFollowedUsers: (followedUsers) => set({ followedUsers }),
  logout: () => set({ publicKey: null, privateKey: null, profile: null }),
}));
