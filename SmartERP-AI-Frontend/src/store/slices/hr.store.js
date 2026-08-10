import { create } from 'zustand'

const useHrStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setHrStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useHrStore
