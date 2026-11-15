import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { MemberLayout } from '@/layouts/MemberLayout'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { PendingApprovalPage } from '@/features/auth/PendingApprovalPage'
import { RequireAuth, RequireMemberRole, RequireStaffRole } from '@/features/auth/ProtectedRoute'
import { AdminDashboard } from '@/features/dashboard/AdminDashboard'
import { ApplicationsPage } from '@/features/membership/ApplicationsPage'
import { ContributionsPage } from '@/features/membership/ContributionsPage'
import { MembersPage } from '@/features/membership/MembersPage'
import { MembershipStatusPage } from '@/features/membership/MembershipStatusPage'
import { VehiclesPage } from '@/features/fleet/VehiclesPage'
import { MaintenancePage } from '@/features/fleet/MaintenancePage'
import { FuelExpensePage } from '@/features/fleet/FuelExpensePage'
import { DispatchDashboardPage } from '@/features/dispatch/DispatchDashboardPage'
import { CollectionsPosPage } from '@/features/collections/CollectionsPosPage'
import { LoansDashboardPage } from '@/features/loans/LoansDashboardPage'
import { LoanSubPage } from '@/features/loans/LoanSubPage'
import { FinanceDashboardPage } from '@/features/finance/FinanceDashboardPage'
import { FinanceSubPage } from '@/features/finance/FinanceSubPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { SettingsSectionPage } from '@/features/settings/SettingsSectionPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { PayrollPage } from '@/features/payroll/PayrollPage'
import { UsersPage } from '@/features/users/UsersPage'
import { MemberDashboard } from '@/features/member/MemberDashboard'
import { MemberSubPage } from '@/features/member/MemberSubPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

function AdminShell({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/pending-approval', element: <PendingApprovalPage /> },
      {
        element: <RequireStaffRole />,
        children: [
          { path: '/admin', element: <AdminShell><AdminDashboard /></AdminShell> },
          { path: '/admin/membership/members', element: <AdminShell><MembersPage /></AdminShell> },
          { path: '/admin/membership/applications', element: <AdminShell><ApplicationsPage /></AdminShell> },
          { path: '/admin/membership/contributions', element: <AdminShell><ContributionsPage /></AdminShell> },
          { path: '/admin/membership/status', element: <AdminShell><MembershipStatusPage /></AdminShell> },
          { path: '/admin/fleet/vehicles', element: <AdminShell><VehiclesPage /></AdminShell> },
          { path: '/admin/fleet/maintenance', element: <AdminShell><MaintenancePage /></AdminShell> },
          { path: '/admin/fleet/fuel-expense', element: <AdminShell><FuelExpensePage /></AdminShell> },
          { path: '/admin/fleet/dispatch', element: <AdminShell><DispatchDashboardPage /></AdminShell> },
          { path: '/admin/dispatch', element: <Navigate to="/admin/fleet/dispatch" replace /> },
          { path: '/admin/trips/schedule', element: <Navigate to="/admin/fleet/dispatch" replace /> },
          { path: '/admin/trips/records', element: <Navigate to="/admin/fleet/dispatch" replace /> },
          { path: '/admin/collections/pos', element: <AdminShell><CollectionsPosPage /></AdminShell> },
          { path: '/admin/loans', element: <AdminShell><LoansDashboardPage /></AdminShell> },
          { path: '/admin/loans/:section', element: <AdminShell><LoanSubPage /></AdminShell> },
          { path: '/admin/finance', element: <AdminShell><FinanceDashboardPage /></AdminShell> },
          { path: '/admin/finance/:section', element: <AdminShell><FinanceSubPage /></AdminShell> },
          { path: '/admin/reports', element: <AdminShell><ReportsPage /></AdminShell> },
          { path: '/admin/settings', element: <AdminShell><SettingsPage /></AdminShell> },
          { path: '/admin/settings/:slug', element: <AdminShell><SettingsSectionPage /></AdminShell> },
          { path: '/admin/payroll', element: <AdminShell><PayrollPage /></AdminShell> },
          { path: '/admin/inventory', element: <AdminShell><InventoryPage /></AdminShell> },
          { path: '/admin/documents', element: <AdminShell><DocumentsPage /></AdminShell> },
          { path: '/admin/users', element: <AdminShell><UsersPage /></AdminShell> },
        ],
      },
      {
        element: <RequireMemberRole />,
        children: [
          {
            element: <MemberLayout />,
            children: [
              { path: '/member', element: <MemberDashboard /> },
              { path: '/member/:section', element: <MemberSubPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])