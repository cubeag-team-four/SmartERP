import { USER_ROLES } from "../core/constants/app.constant";
import RoutePath from "../core/constants/routes.constant";

export const dashboardRoutes = {
  [USER_ROLES.SUPER_ADMIN]: RoutePath.SUPER_ADMIN_DASHBOARD,

  [USER_ROLES.ADMIN]: RoutePath.ADMIN_DASHBOARD,

  [USER_ROLES.FINANCE_MANAGER]: RoutePath.FINANCE_DASHBOARD,

  [USER_ROLES.SALES_MANAGER]: RoutePath.SALES_DASHBOARD,

  [USER_ROLES.HR_MANAGER]: RoutePath.HR_DASHBOARD,

  [USER_ROLES.OPERATIONS_MANAGER]: RoutePath.OPERATIONS_DASHBOARD,

  [USER_ROLES.EMPLOYEE]: RoutePath.EMPLOYEE_DASHBOARD,
};