import { useEffect, useState } from 'react'
import authService from '../services/auth.service'

/** Mirrors the backend defaults; replaced by GET /auth/password-policy when it loads. */
export const DEFAULT_PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 128,
  requiredCharacterClasses: 3,
  historySize: 5,
  breachCheck: true,
}

let cachedPolicy = null
let policyRequest = null

const loadPolicy = () => {
  if (!policyRequest) {
    policyRequest = authService
      .passwordPolicy()
      .then((policy) => {
        cachedPolicy = { ...DEFAULT_PASSWORD_POLICY, ...(policy || {}) }
        return cachedPolicy
      })
      .catch(() => {
        policyRequest = null // allow a later retry; keep using defaults meanwhile
        return DEFAULT_PASSWORD_POLICY
      })
  }
  return policyRequest
}

/** Returns the server password policy (defaults until it loads). */
export const usePasswordPolicy = () => {
  const [policy, setPolicy] = useState(cachedPolicy || DEFAULT_PASSWORD_POLICY)
  useEffect(() => {
    let active = true
    loadPolicy().then((p) => {
      if (active) setPolicy(p)
    })
    return () => {
      active = false
    }
  }, [])
  return policy
}

/** Same tokenisation as the backend: email local part (+ its ./_/+/- pieces) and name words, 3+ chars. */
const personalTokens = ({ name, email } = {}) => {
  const tokens = []
  if (email && email.includes('@')) {
    const local = email.slice(0, email.indexOf('@')).toLowerCase()
    tokens.push(local, ...local.split(/[._+-]/))
  }
  if (name) tokens.push(...name.toLowerCase().split(/\s+/))
  return [...new Set(tokens.filter((t) => t.length >= 3))]
}

/**
 * Live checklist for the password policy.
 * Each check: { id, label, ok } where ok is true/false, or null when it can only
 * be verified by the server (common/breached passwords, password history).
 */
export const evaluatePassword = (password = '', context = {}, policy = DEFAULT_PASSWORD_POLICY) => {
  const min = policy.minLength || DEFAULT_PASSWORD_POLICY.minLength
  const max = policy.maxLength || DEFAULT_PASSWORD_POLICY.maxLength
  const required = policy.requiredCharacterClasses || DEFAULT_PASSWORD_POLICY.requiredCharacterClasses

  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  const lower = password.toLowerCase()
  const tokens = personalTokens(context)
  const hasContext = !!(context.name || context.email)

  const checks = [
    {
      id: 'length',
      label: `At least ${min} characters`,
      ok: password.length >= min && password.length <= max,
    },
    {
      id: 'classes',
      label: `At least ${required} of: uppercase, lowercase, number, symbol`,
      ok: classes >= required,
    },
  ]

  if (hasContext) {
    checks.push({
      id: 'personal',
      label: 'Does not contain your name or email',
      ok: password.length > 0 && !tokens.some((t) => lower.includes(t)),
    })
  } else {
    checks.push({ id: 'personal', label: 'Does not contain your name or email', ok: null })
  }

  checks.push({ id: 'common', label: 'Not a common or previously breached password', ok: null })

  if (password.length > max) {
    checks[0] = { ...checks[0], label: `Between ${min} and ${max} characters` }
  }

  const valid = checks.every((c) => c.ok !== false)
  return { checks, valid }
}
