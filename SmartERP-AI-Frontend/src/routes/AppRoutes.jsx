import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import DashboardLayout from '../layouts/DashboardLayout'
import AuthLayout from '../layouts/AuthLayout'
import PublicLayout from '../layouts/PublicLayout'
import ProtectedRoute from './ProtectedRoute'

// Auth pages
import Login from '../pages/auth/Login'
import Signup from '../pages/auth/Signup'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import VerifyOtp from '../pages/auth/VerifyOtp'

// Public pages
import Landing from '../pages/public/Landing'
import Pricing from '../pages/public/Pricing'
import AboutUs from '../pages/public/AboutUs'
import ContactUs from '../pages/public/ContactUs'
import NotFound from '../pages/public/NotFound'

// Role landing dashboards
import AdminDashboard from '../pages/admin/AdminDashboard'
import UserDashboard from '../pages/user/UserDashboard'
import SuperAdminDashboard from '../pages/superAdmin/SuperAdminDashboard'
import Tenants from '../pages/superAdmin/Tenants'
import TenantDetails from '../pages/superAdmin/TenantDetails'
import SubscriptionPlans from '../pages/superAdmin/SubscriptionPlans'
import PlatformSettings from '../pages/superAdmin/PlatformSettings'
import PlatformUsers from '../pages/superAdmin/PlatformUsers'

// Business modules are code-split (one chunk per module) via React.lazy
const companyManagementDashboard = lazy(() => import('../pages/modules/companyManagement/Dashboard'))
const companyManagementOverview = lazy(() => import('../pages/modules/companyManagement/Overview'))
const companyManagementCompanyProfile = lazy(() => import('../pages/modules/companyManagement/CompanyProfile'))
const companyManagementBranches = lazy(() => import('../pages/modules/companyManagement/Branches'))
const companyManagementDepartments = lazy(() => import('../pages/modules/companyManagement/Departments'))
const companyManagementCostCenters = lazy(() => import('../pages/modules/companyManagement/CostCenters'))
const companyManagementOrganizationChart = lazy(() => import('../pages/modules/companyManagement/OrganizationChart'))
const companyManagementUsers = lazy(() => import('../pages/modules/companyManagement/Users'))
const companyManagementRolesPermissions = lazy(() => import('../pages/modules/companyManagement/RolesPermissions'))
const companyManagementApprovalWorkflows = lazy(() => import('../pages/modules/companyManagement/ApprovalWorkflows'))
const companyManagementCompanySettings = lazy(() => import('../pages/modules/companyManagement/CompanySettings'))
const companyManagementBranchSettings = lazy(() => import('../pages/modules/companyManagement/BranchSettings'))
const companyManagementHolidays = lazy(() => import('../pages/modules/companyManagement/Holidays'))
const companyManagementSubscription = lazy(() => import('../pages/modules/companyManagement/Subscription'))
const crmDashboard = lazy(() => import('../pages/modules/crm/Dashboard'))
const crmOverview = lazy(() => import('../pages/modules/crm/Overview'))
const crmLeads = lazy(() => import('../pages/modules/crm/Leads'))
const crmCustomers = lazy(() => import('../pages/modules/crm/Customers'))
const crmSalesPipeline = lazy(() => import('../pages/modules/crm/SalesPipeline'))
const crmFollowUps = lazy(() => import('../pages/modules/crm/FollowUps'))
const crmCommunicationHistory = lazy(() => import('../pages/modules/crm/CommunicationHistory'))
const salesDashboard = lazy(() => import('../pages/modules/sales/Dashboard'))
const salesOverview = lazy(() => import('../pages/modules/sales/Overview'))
const salesQuotations = lazy(() => import('../pages/modules/sales/Quotations'))
const salesSalesOrders = lazy(() => import('../pages/modules/sales/SalesOrders'))
const salesInvoices = lazy(() => import('../pages/modules/sales/Invoices'))
const salesPaymentsAndAging = lazy(() => import('../pages/modules/sales/PaymentsAndAging'))
const salesCustomerReports = lazy(() => import('../pages/modules/sales/CustomerReports'))
const purchaseDashboard = lazy(() => import('../pages/modules/purchase/Dashboard'))
const purchaseOverview = lazy(() => import('../pages/modules/purchase/Overview'))
const purchaseVendors = lazy(() => import('../pages/modules/purchase/Vendors'))
const purchasePurchaseRequests = lazy(() => import('../pages/modules/purchase/PurchaseRequests'))
const purchasePurchaseOrders = lazy(() => import('../pages/modules/purchase/PurchaseOrders'))
const purchaseGoodsReceipts = lazy(() => import('../pages/modules/purchase/GoodsReceipts'))
const purchaseSupplierPayments = lazy(() => import('../pages/modules/purchase/SupplierPayments'))
const purchasePayablesAging = lazy(() => import('../pages/modules/purchase/PayablesAging'))
const inventoryDashboard = lazy(() => import('../pages/modules/inventory/Dashboard'))
const inventoryOverview = lazy(() => import('../pages/modules/inventory/Overview'))
const inventoryStock = lazy(() => import('../pages/modules/inventory/Stock'))
const inventoryWarehouses = lazy(() => import('../pages/modules/inventory/Warehouses'))
const inventoryBatchLotTracking = lazy(() => import('../pages/modules/inventory/BatchLotTracking'))
const inventoryBarcodeQrManagement = lazy(() => import('../pages/modules/inventory/BarcodeQrManagement'))
const inventoryStockTransfers = lazy(() => import('../pages/modules/inventory/StockTransfers'))
const manufacturingDashboard = lazy(() => import('../pages/modules/manufacturing/Dashboard'))
const manufacturingOverview = lazy(() => import('../pages/modules/manufacturing/Overview'))
const manufacturingBillOfMaterials = lazy(() => import('../pages/modules/manufacturing/BillOfMaterials'))
const manufacturingWorkOrders = lazy(() => import('../pages/modules/manufacturing/WorkOrders'))
const manufacturingMachineTracking = lazy(() => import('../pages/modules/manufacturing/MachineTracking'))
const manufacturingQualityControl = lazy(() => import('../pages/modules/manufacturing/QualityControl'))
const financeDashboard = lazy(() => import('../pages/modules/finance/Dashboard'))
const financeOverview = lazy(() => import('../pages/modules/finance/Overview'))
const financeGeneralLedger = lazy(() => import('../pages/modules/finance/GeneralLedger'))
const financeJournalEntries = lazy(() => import('../pages/modules/finance/JournalEntries'))
const financeExpenseTracking = lazy(() => import('../pages/modules/finance/ExpenseTracking'))
const financeIncomeTracking = lazy(() => import('../pages/modules/finance/IncomeTracking'))
const financeTaxManagement = lazy(() => import('../pages/modules/finance/TaxManagement'))
const financeGstReports = lazy(() => import('../pages/modules/finance/GstReports'))
const financeBalanceSheet = lazy(() => import('../pages/modules/finance/BalanceSheet'))
const hrDashboard = lazy(() => import('../pages/modules/hr/Dashboard'))
const hrOverview = lazy(() => import('../pages/modules/hr/Overview'))
const hrEmployeeDatabase = lazy(() => import('../pages/modules/hr/EmployeeDatabase'))
const hrAttendance = lazy(() => import('../pages/modules/hr/Attendance'))
const hrLeaveManagement = lazy(() => import('../pages/modules/hr/LeaveManagement'))
const hrPayroll = lazy(() => import('../pages/modules/hr/Payroll'))
const hrPerformanceTracking = lazy(() => import('../pages/modules/hr/PerformanceTracking'))
const projectsDashboard = lazy(() => import('../pages/modules/projects/Dashboard'))
const projectsOverview = lazy(() => import('../pages/modules/projects/Overview'))
const projectsProjectPlanning = lazy(() => import('../pages/modules/projects/ProjectPlanning'))
const projectsTasks = lazy(() => import('../pages/modules/projects/Tasks'))
const projectsTimeTracking = lazy(() => import('../pages/modules/projects/TimeTracking'))
const projectsBudgetMonitoring = lazy(() => import('../pages/modules/projects/BudgetMonitoring'))
const projectsProjectDocuments = lazy(() => import('../pages/modules/projects/ProjectDocuments'))
const reportsDashboard = lazy(() => import('../pages/modules/reports/Dashboard'))
const reportsOverview = lazy(() => import('../pages/modules/reports/Overview'))
const reportsSalesReports = lazy(() => import('../pages/modules/reports/SalesReports'))
const reportsPurchaseReports = lazy(() => import('../pages/modules/reports/PurchaseReports'))
const reportsInventoryReports = lazy(() => import('../pages/modules/reports/InventoryReports'))
const reportsFinanceReports = lazy(() => import('../pages/modules/reports/FinanceReports'))
const reportsHrReports = lazy(() => import('../pages/modules/reports/HrReports'))
const reportsProjectReports = lazy(() => import('../pages/modules/reports/ProjectReports'))
const documentsDashboard = lazy(() => import('../pages/modules/documents/Dashboard'))
const documentsOverview = lazy(() => import('../pages/modules/documents/Overview'))
const documentsUploadDocuments = lazy(() => import('../pages/modules/documents/UploadDocuments'))
const documentsVersionControl = lazy(() => import('../pages/modules/documents/VersionControl'))
const documentsDigitalApprovals = lazy(() => import('../pages/modules/documents/DigitalApprovals'))
const documentsDocumentSearch = lazy(() => import('../pages/modules/documents/DocumentSearch'))
const settingsDashboard = lazy(() => import('../pages/modules/settings/Dashboard'))
const settingsOverview = lazy(() => import('../pages/modules/settings/Overview'))
const settingsGeneralSettings = lazy(() => import('../pages/modules/settings/GeneralSettings'))
const settingsUserManagement = lazy(() => import('../pages/modules/settings/UserManagement'))
const settingsRolesPermissions = lazy(() => import('../pages/modules/settings/RolesPermissions'))
const settingsNotificationSettings = lazy(() => import('../pages/modules/settings/NotificationSettings'))
const settingsIntegrationSettings = lazy(() => import('../pages/modules/settings/IntegrationSettings'))
const settingsApprovalWorkflowSettings = lazy(() => import('../pages/modules/settings/ApprovalWorkflowSettings'))
const settingsBackupSecurity = lazy(() => import('../pages/modules/settings/BackupSecurity'))

// Cross-cutting AI capabilities (Section 4.11 of the SRS)
const aiBusinessAssistant = lazy(() => import('../pages/modules/aiAssistant/BusinessAssistant'))
const aiDashboardAnalytics = lazy(() => import('../pages/modules/aiAssistant/DashboardAnalytics'))
const aiForecastingEngine = lazy(() => import('../pages/modules/aiAssistant/ForecastingEngine'))
const aiDocumentProcessing = lazy(() => import('../pages/modules/aiAssistant/DocumentProcessing'))
const aiWorkflowAutomation = lazy(() => import('../pages/modules/aiAssistant/WorkflowAutomation'))
const aiFraudDetection = lazy(() => import('../pages/modules/aiAssistant/FraudDetection'))
const aiSupportChatbot = lazy(() => import('../pages/modules/aiAssistant/SupportChatbot'))
const aiReportGenerator = lazy(() => import('../pages/modules/aiAssistant/ReportGenerator'))

const AppRoutes = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Public / marketing */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
        </Route>

        {/* Authentication */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
        </Route>

        {/* Super Admin (platform / cross-tenant) */}
        <Route element={<ProtectedRoute allowedRoles={['superAdmin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/super-admin/tenants" element={<Tenants />} />
            <Route path="/super-admin/tenants/:id" element={<TenantDetails />} />
            <Route path="/super-admin/subscriptions" element={<SubscriptionPlans />} />
            <Route path="/super-admin/settings" element={<PlatformSettings />} />
            <Route path="/super-admin/users" element={<PlatformUsers />} />
          </Route>
        </Route>

        {/* Admin + User: tenant workspace, all 10 core modules + AI layer */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'user']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<UserDashboard />} />

            {/* Company Management */}
            <Route path="/company" element={<companyManagementDashboard />} />
            <Route path="/company/overview" element={<companyManagementOverview />} />
            <Route path="/company/company-profile" element={<companyManagementCompanyProfile />} />
            <Route path="/company/branches" element={<companyManagementBranches />} />
            <Route path="/company/departments" element={<companyManagementDepartments />} />
            <Route path="/company/cost-centers" element={<companyManagementCostCenters />} />
            <Route path="/company/organization-chart" element={<companyManagementOrganizationChart />} />
            <Route path="/company/users" element={<companyManagementUsers />} />
            <Route path="/company/roles-permissions" element={<companyManagementRolesPermissions />} />
            <Route path="/company/approval-workflows" element={<companyManagementApprovalWorkflows />} />
            <Route path="/company/company-settings" element={<companyManagementCompanySettings />} />
            <Route path="/company/branch-settings" element={<companyManagementBranchSettings />} />
            <Route path="/company/holidays" element={<companyManagementHolidays />} />
            <Route path="/company/subscription" element={<companyManagementSubscription />} />

            {/* CRM */}
            <Route path="/crm" element={<crmDashboard />} />
            <Route path="/crm/overview" element={<crmOverview />} />
            <Route path="/crm/leads" element={<crmLeads />} />
            <Route path="/crm/customers" element={<crmCustomers />} />
            <Route path="/crm/sales-pipeline" element={<crmSalesPipeline />} />
            <Route path="/crm/follow-ups" element={<crmFollowUps />} />
            <Route path="/crm/communication-history" element={<crmCommunicationHistory />} />

            {/* Sales */}
            <Route path="/sales" element={<salesDashboard />} />
            <Route path="/sales/overview" element={<salesOverview />} />
            <Route path="/sales/quotations" element={<salesQuotations />} />
            <Route path="/sales/sales-orders" element={<salesSalesOrders />} />
            <Route path="/sales/invoices" element={<salesInvoices />} />
            <Route path="/sales/payments-and-aging" element={<salesPaymentsAndAging />} />
            <Route path="/sales/customer-reports" element={<salesCustomerReports />} />

            {/* Purchase */}
            <Route path="/purchase" element={<purchaseDashboard />} />
            <Route path="/purchase/overview" element={<purchaseOverview />} />
            <Route path="/purchase/vendors" element={<purchaseVendors />} />
            <Route path="/purchase/purchase-requests" element={<purchasePurchaseRequests />} />
            <Route path="/purchase/purchase-orders" element={<purchasePurchaseOrders />} />
            <Route path="/purchase/goods-receipts" element={<purchaseGoodsReceipts />} />
            <Route path="/purchase/supplier-payments" element={<purchaseSupplierPayments />} />
            <Route path="/purchase/payables-aging" element={<purchasePayablesAging />} />

            {/* Inventory */}
            <Route path="/inventory" element={<inventoryDashboard />} />
            <Route path="/inventory/overview" element={<inventoryOverview />} />
            <Route path="/inventory/stock" element={<inventoryStock />} />
            <Route path="/inventory/warehouses" element={<inventoryWarehouses />} />
            <Route path="/inventory/batch-lot-tracking" element={<inventoryBatchLotTracking />} />
            <Route path="/inventory/barcode-qr-management" element={<inventoryBarcodeQrManagement />} />
            <Route path="/inventory/stock-transfers" element={<inventoryStockTransfers />} />

            {/* Manufacturing */}
            <Route path="/manufacturing" element={<manufacturingDashboard />} />
            <Route path="/manufacturing/overview" element={<manufacturingOverview />} />
            <Route path="/manufacturing/bill-of-materials" element={<manufacturingBillOfMaterials />} />
            <Route path="/manufacturing/work-orders" element={<manufacturingWorkOrders />} />
            <Route path="/manufacturing/machine-tracking" element={<manufacturingMachineTracking />} />
            <Route path="/manufacturing/quality-control" element={<manufacturingQualityControl />} />

            {/* Finance & Accounts */}
            <Route path="/finance" element={<financeDashboard />} />
            <Route path="/finance/overview" element={<financeOverview />} />
            <Route path="/finance/general-ledger" element={<financeGeneralLedger />} />
            <Route path="/finance/journal-entries" element={<financeJournalEntries />} />
            <Route path="/finance/expense-tracking" element={<financeExpenseTracking />} />
            <Route path="/finance/income-tracking" element={<financeIncomeTracking />} />
            <Route path="/finance/tax-management" element={<financeTaxManagement />} />
            <Route path="/finance/gst-reports" element={<financeGstReports />} />
            <Route path="/finance/balance-sheet" element={<financeBalanceSheet />} />

            {/* HR & Payroll */}
            <Route path="/hr" element={<hrDashboard />} />
            <Route path="/hr/overview" element={<hrOverview />} />
            <Route path="/hr/employee-database" element={<hrEmployeeDatabase />} />
            <Route path="/hr/attendance" element={<hrAttendance />} />
            <Route path="/hr/leave-management" element={<hrLeaveManagement />} />
            <Route path="/hr/payroll" element={<hrPayroll />} />
            <Route path="/hr/performance-tracking" element={<hrPerformanceTracking />} />

            {/* Projects */}
            <Route path="/projects" element={<projectsDashboard />} />
            <Route path="/projects/overview" element={<projectsOverview />} />
            <Route path="/projects/project-planning" element={<projectsProjectPlanning />} />
            <Route path="/projects/tasks" element={<projectsTasks />} />
            <Route path="/projects/time-tracking" element={<projectsTimeTracking />} />
            <Route path="/projects/budget-monitoring" element={<projectsBudgetMonitoring />} />
            <Route path="/projects/project-documents" element={<projectsProjectDocuments />} />

            {/* Reports & Analytics */}
            <Route path="/reports" element={<reportsDashboard />} />
            <Route path="/reports/overview" element={<reportsOverview />} />
            <Route path="/reports/sales-reports" element={<reportsSalesReports />} />
            <Route path="/reports/purchase-reports" element={<reportsPurchaseReports />} />
            <Route path="/reports/inventory-reports" element={<reportsInventoryReports />} />
            <Route path="/reports/finance-reports" element={<reportsFinanceReports />} />
            <Route path="/reports/hr-reports" element={<reportsHrReports />} />
            <Route path="/reports/project-reports" element={<reportsProjectReports />} />

            {/* Documents */}
            <Route path="/documents" element={<documentsDashboard />} />
            <Route path="/documents/overview" element={<documentsOverview />} />
            <Route path="/documents/upload-documents" element={<documentsUploadDocuments />} />
            <Route path="/documents/version-control" element={<documentsVersionControl />} />
            <Route path="/documents/digital-approvals" element={<documentsDigitalApprovals />} />
            <Route path="/documents/document-search" element={<documentsDocumentSearch />} />

            {/* Settings */}
            <Route path="/settings" element={<settingsDashboard />} />
            <Route path="/settings/overview" element={<settingsOverview />} />
            <Route path="/settings/general-settings" element={<settingsGeneralSettings />} />
            <Route path="/settings/user-management" element={<settingsUserManagement />} />
            <Route path="/settings/roles-permissions" element={<settingsRolesPermissions />} />
            <Route path="/settings/notification-settings" element={<settingsNotificationSettings />} />
            <Route path="/settings/integration-settings" element={<settingsIntegrationSettings />} />
            <Route path="/settings/approval-workflow-settings" element={<settingsApprovalWorkflowSettings />} />
            <Route path="/settings/backup-security" element={<settingsBackupSecurity />} />

            {/* Cross-cutting AI capabilities */}
            <Route path="/ai/business-assistant" element={<aiBusinessAssistant />} />
            <Route path="/ai/dashboard-analytics" element={<aiDashboardAnalytics />} />
            <Route path="/ai/forecasting-engine" element={<aiForecastingEngine />} />
            <Route path="/ai/document-processing" element={<aiDocumentProcessing />} />
            <Route path="/ai/workflow-automation" element={<aiWorkflowAutomation />} />
            <Route path="/ai/fraud-detection" element={<aiFraudDetection />} />
            <Route path="/ai/support-chatbot" element={<aiSupportChatbot />} />
            <Route path="/ai/report-generator" element={<aiReportGenerator />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
