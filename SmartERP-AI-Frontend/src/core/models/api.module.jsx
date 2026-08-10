// Generic API envelope shape returned by every SmartERP AI REST endpoint
// (see SRS Section 10.1, Shared API Conventions)
export const ApiResponseModel = {
  success: true,
  data: null,
  message: '',
  errors: [],
  meta: { page: 1, pageSize: 10, total: 0 },
}
