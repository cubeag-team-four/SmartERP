import { create } from 'zustand'

const useSalesStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setSalesStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useSalesStore
