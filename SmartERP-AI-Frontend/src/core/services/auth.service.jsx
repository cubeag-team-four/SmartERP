import axios from '../../utils/axios'

/**
 * Auth API calls. Every method resolves with the unwrapped `data` field of the
 * backend's `{ success, message, data }` envelope. Errors are axios errors whose
 * `response.data` is an RFC 7807 ProblemDetail (`detail`, `code`, ...) — use
 * core/utils/apiError.js to read them.
 *
 * Session-cookie endpoints (/auth/refresh, /auth/logout) live in
 * session.service.js because they must bypass the 401-refresh interceptor.
 */
const unwrap = (response) => response?.data?.data

const authService = {
  /** -> LoginResponse ({ status: AUTHENTICATED | MFA_REQUIRED | MFA_ENROLLMENT_REQUIRED, ... }) */
  login: ({ email, password, tenantCode }) =>
    axios
      .post('/auth/login', { email, password, ...(tenantCode ? { tenantCode } : {}) })
      .then(unwrap),

  /** -> { tenantCode, companyName, email } */
  signup: (payload) => axios.post('/auth/signup', payload).then(unwrap),

  /** Exactly one of code / recoveryCode. -> AUTHENTICATED LoginResponse */
  verifyMfa: ({ mfaToken, code, recoveryCode }) =>
    axios
      .post('/auth/mfa/verify', {
        mfaToken,
        ...(recoveryCode ? { recoveryCode } : { code }),
      })
      .then(unwrap),

  /** With mfaToken: login-time enrollment. Without: signed-in user (Bearer). -> { secret, otpauthUri, issuer, accountName } */
  setupMfa: (mfaToken) =>
    axios.post('/auth/mfa/setup', mfaToken ? { mfaToken } : undefined).then(unwrap),

  /**
   * With mfaToken -> AUTHENTICATED LoginResponse incl. recoveryCodes.
   * Without (Bearer) -> { mfaEnabled, recoveryCodes }.
   */
  enableMfa: ({ mfaToken, code }) =>
    axios.post('/auth/mfa/enable', mfaToken ? { mfaToken, code } : { code }).then(unwrap),

  /** -> { enabled, required, enrolledAt, recoveryCodesRemaining } */
  mfaStatus: () => axios.get('/auth/mfa/status').then(unwrap),

  /** -> { recoveryCodes } */
  regenerateRecoveryCodes: (code) => axios.post('/auth/mfa/recovery-codes', { code }).then(unwrap),

  disableMfa: ({ password, code }) => axios.post('/auth/mfa/disable', { password, code }).then(unwrap),

  /** Succeeds (202) whether or not the account exists. */
  forgotPassword: (email) => axios.post('/auth/forgot-password', { email }).then(unwrap),

  resetPassword: ({ token, newPassword }) =>
    axios.post('/auth/reset-password', { token, newPassword }).then(unwrap),

  /** Revokes ALL sessions on success — the caller must send the user back to /login. */
  changePassword: ({ oldPassword, newPassword }) =>
    axios.post('/auth/change-password', { oldPassword, newPassword }).then(unwrap),

  /** -> { minLength, maxLength, requiredCharacterClasses, historySize, breachCheck } */
  passwordPolicy: () => axios.get('/auth/password-policy').then(unwrap),

  /** -> { userId, tenantId, tenantCode, name, email, role, roles, permissions, mfaEnabled, mfaRequired } */
  me: () => axios.get('/auth/me').then(unwrap),
}

export default authService
