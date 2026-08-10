import { create } from 'zustand'

const usePurchaseStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setPurchaseStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default usePurchaseStore
