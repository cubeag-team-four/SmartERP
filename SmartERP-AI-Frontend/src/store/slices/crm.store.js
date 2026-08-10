import { create } from 'zustand'

const useCrmStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setCrmStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useCrmStore
