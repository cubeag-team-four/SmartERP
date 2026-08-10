import { create } from 'zustand'

const useSettingsStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setSettingsStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useSettingsStore
