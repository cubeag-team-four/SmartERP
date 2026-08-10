import { useState, useEffect } from 'react'

const usePermissions = () => {
  const [permissions, setPermissions] = useState([])

  const can = (permissionKey) => permissions.includes(permissionKey)

  return { permissions, can }
}

export default usePermissions
