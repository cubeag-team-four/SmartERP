export const formatRole = (role) => {
  if (!role) {
    return "Employee";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};