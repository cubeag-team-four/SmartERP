export const hasPermission = (userPermissions = [], required) =>
  userPermissions.includes(required)
