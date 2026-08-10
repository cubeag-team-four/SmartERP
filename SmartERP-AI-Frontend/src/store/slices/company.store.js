import { create } from 'zustand'

const useCompanyStore = create((set) => ({
  companies: [],
  loading: false,
  error: null,
  setCompanyStore: (companies) => set({ companies }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

export default useCompanyStore
