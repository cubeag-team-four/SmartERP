import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  Receipt,
  ShoppingCart,
  Package,
  UserRound,
  CalendarDays,
  Clock,
  FileText,
  BarChart3,
  Settings,
  Bell,
  BriefcaseBusiness,
  UserCheck,
} from "lucide-react";

import { USER_ROLES } from "../core/constants/app.constant";
import RoutePath from "../core/constants/routes.constant";

export const sidebarMenus = {
  // =====================================================
  // SUPER ADMIN
  // =====================================================
  [USER_ROLES.SUPER_ADMIN]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.SUPER_ADMIN_DASHBOARD,
    },
    {
      label: "Company Management",
      icon: Building2,
      path: RoutePath.COMPANY_MANAGEMENT,
    },
    {
      label: "Users",
      icon: Users,
      path: RoutePath.USERS,
    },
    {
      label: "Roles & Permissions",
      icon: UserCheck,
      path: RoutePath.ROLES_PERMISSIONS,
    },
    {
      label: "Finance",
      icon: Wallet,
      path: RoutePath.FINANCE,
    },
    {
      label: "Sales",
      icon: ShoppingCart,
      path: RoutePath.SALES,
    },
    {
      label: "HR",
      icon: BriefcaseBusiness,
      path: RoutePath.HR,
    },
    {
      label: "Operations",
      icon: Package,
      path: RoutePath.OPERATIONS,
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: RoutePath.REPORTS,
    },
    {
      label: "Notifications",
      icon: Bell,
      path: RoutePath.NOTIFICATIONS,
    },
    {
      label: "Settings",
      icon: Settings,
      path: RoutePath.SETTINGS,
    },
  ],

  // =====================================================
  // ADMIN
  // =====================================================
  [USER_ROLES.ADMIN]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.ADMIN_DASHBOARD,
    },
    {
      label: "Company Management",
      icon: Building2,
      path: RoutePath.COMPANY_MANAGEMENT,
    },
    {
      label: "Users",
      icon: Users,
      path: RoutePath.USERS,
    },
    {
      label: "Roles & Permissions",
      icon: UserCheck,
      path: RoutePath.ROLES_PERMISSIONS,
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: RoutePath.REPORTS,
    },
    {
      label: "Settings",
      icon: Settings,
      path: RoutePath.SETTINGS,
    },
  ],

  // =====================================================
  // FINANCE MANAGER
  // =====================================================
  [USER_ROLES.FINANCE_MANAGER]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.FINANCE_DASHBOARD,
    },
    {
      label: "Accounts",
      icon: Wallet,
      path: RoutePath.FINANCE_ACCOUNTS,
    },
    {
      label: "Invoices",
      icon: Receipt,
      path: RoutePath.FINANCE_INVOICES,
    },
    {
      label: "Payments",
      icon: Wallet,
      path: RoutePath.FINANCE_PAYMENTS,
    },
    {
      label: "Receivables",
      icon: Receipt,
      path: RoutePath.FINANCE_RECEIVABLES,
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: RoutePath.FINANCE_REPORTS,
    },
  ],

  // =====================================================
  // SALES MANAGER
  // =====================================================
  [USER_ROLES.SALES_MANAGER]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.SALES_DASHBOARD,
    },
    {
      label: "Customers",
      icon: Users,
      path: RoutePath.SALES_CUSTOMERS,
    },
    {
      label: "Leads",
      icon: UserRound,
      path: RoutePath.SALES_LEADS,
    },
    {
      label: "Invoices",
      icon: Receipt,
      path: RoutePath.SALES_INVOICES,
    },
    {
      label: "Sales",
      icon: ShoppingCart,
      path: RoutePath.SALES,
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: RoutePath.SALES_REPORTS,
    },
  ],

  // =====================================================
  // HR MANAGER
  // =====================================================
  [USER_ROLES.HR_MANAGER]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.HR_DASHBOARD,
    },
    {
      label: "Employees",
      icon: Users,
      path: RoutePath.HR_EMPLOYEES,
    },
    {
      label: "Attendance",
      icon: Clock,
      path: RoutePath.HR_ATTENDANCE,
    },
    {
      label: "Leave Management",
      icon: CalendarDays,
      path: RoutePath.HR_LEAVE,
    },
    {
      label: "Payroll",
      icon: Wallet,
      path: RoutePath.HR_PAYROLL,
    },
    {
      label: "Performance",
      icon: BarChart3,
      path: RoutePath.HR_PERFORMANCE,
    },
    {
      label: "Reports",
      icon: FileText,
      path: RoutePath.HR_REPORTS,
    },
  ],

  // =====================================================
  // OPERATIONS MANAGER
  // =====================================================
  [USER_ROLES.OPERATIONS_MANAGER]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.OPERATIONS_DASHBOARD,
    },
    {
      label: "Inventory",
      icon: Package,
      path: RoutePath.OPERATIONS_INVENTORY,
    },
    {
      label: "Purchase",
      icon: ShoppingCart,
      path: RoutePath.OPERATIONS_PURCHASE,
    },
    {
      label: "Logistics",
      icon: Package,
      path: RoutePath.OPERATIONS_LOGISTICS,
    },
    {
      label: "Suppliers",
      icon: Users,
      path: RoutePath.OPERATIONS_SUPPLIERS,
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: RoutePath.OPERATIONS_REPORTS,
    },
  ],

  // =====================================================
  // EMPLOYEE
  // =====================================================
  [USER_ROLES.EMPLOYEE]: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: RoutePath.EMPLOYEE_DASHBOARD,
    },
    {
      label: "My Profile",
      icon: UserRound,
      path: RoutePath.EMPLOYEE_PROFILE,
    },
    {
      label: "Attendance",
      icon: Clock,
      path: RoutePath.EMPLOYEE_ATTENDANCE,
    },
    {
      label: "My Leaves",
      icon: CalendarDays,
      path: RoutePath.EMPLOYEE_LEAVES,
    },
    {
      label: "My Tasks",
      icon: BriefcaseBusiness,
      path: RoutePath.EMPLOYEE_TASKS,
    },
  ],
};