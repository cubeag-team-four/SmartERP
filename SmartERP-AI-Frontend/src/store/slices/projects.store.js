import { create } from 'zustand'

const useProjectsStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setProjectsStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useProjectsStore
