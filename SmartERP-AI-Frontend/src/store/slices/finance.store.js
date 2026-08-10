import { create } from 'zustand'

const useFinanceStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setFinanceStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useFinanceStore
