import { create } from 'zustand'

const useReportsStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setReportsStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useReportsStore
