import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAVIGATION } from '../../core/constants/navigation.constant'
import useUiStore from '../../store/slices/ui.store'

const toKebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const Sidebar = () => {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const [openModule, setOpenModule] = useState(null)

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
      <nav>
        <ul>
          {NAVIGATION.map((mod) => (
            <li key={mod.key}>
              <button type="button" onClick={() => setOpenModule(openModule === mod.key ? null : mod.key)}>
                {mod.label}
              </button>
              {openModule === mod.key && (
                <ul>
                  {mod.items.map((item) => (
                    <li key={item}>
                      <NavLink to={item === 'Dashboard' ? mod.route : `${mod.route}/${toKebab(item)}`}>
                        {item}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
