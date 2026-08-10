import { create } from 'zustand'

const useCompanyManagementStore = create((set) => ({
  items: [],
  loading: false,
  error: null,
  setCompanyManagementStore: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useCompanyManagementStore
