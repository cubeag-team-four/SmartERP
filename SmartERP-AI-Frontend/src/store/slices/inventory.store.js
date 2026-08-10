import { create } from 'zustand'

const useInventoryStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setInventoryStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useInventoryStore
