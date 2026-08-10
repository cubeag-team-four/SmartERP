import storageService from './storage.service'

export const attachInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    const token = storageService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        storageService.clear()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return axiosInstance
}
