/**
 * Live password-policy checklist. `tone` matches the surrounding page:
 *   dark   — sign-in / reset pages
 *   signup — sign-up page palette
 *   light  — in-app (dashboard) pages
 */
const TONES = {
  dark:   { ok: '#9aae91', bad: '#737970', info: '#5f665e', font: 'monospace' },
  signup: { ok: '#a3c67a', bad: '#6b7280', info: '#6b7280', font: 'monospace' },
  light:  { ok: '#3f7a3a', bad: '#8a8a80', info: '#8a8a80', font: 'inherit' },
}

const PasswordChecklist = ({ checks, tone = 'dark', style }) => {
  const t = TONES[tone] || TONES.dark
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, ...style }} aria-label="Password requirements">
      {checks.map((c) => {
        const color = c.ok === true ? t.ok : c.ok === false ? t.bad : t.info
        const mark = c.ok === true ? '✓' : c.ok === false ? '○' : '·'
        return (
          <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, color, fontFamily: t.font, lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ width: 12, display: 'inline-block', textAlign: 'center' }}>{mark}</span>
            <span>
              {c.label}
              {c.ok === null && <span style={{ opacity: 0.8 }}> (checked when you submit)</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default PasswordChecklist
