import { create } from 'zustand';

export interface GalaxyState {
  selectedTrackId: string | null;
  setSelectedTrack: (id: string | null) => void;
}

export const useGalaxyStore = create<GalaxyState>()((set) => ({
  selectedTrackId: null,
  setSelectedTrack: (id) => set({ selectedTrackId: id }),
}));
