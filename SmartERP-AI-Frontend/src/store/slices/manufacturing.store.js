import { create } from 'zustand'

const useManufacturingStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setManufacturingStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useManufacturingStore
