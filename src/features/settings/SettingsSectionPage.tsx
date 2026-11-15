import type { ReactElement } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { findSettingsItem } from './settingsConfig'
import {
  AccountingRulesPanel,
  ActivityLogsPanel,
  BankAccountsPanel,
  CapitalShareContributionsPanel,
  ChartOfAccountsPanel,
  DataBackupPanel,
  DividendsPatronagePanel,
  FiscalYearPanel,
  ImportExportPanel,
  MembershipConfigurationPanel,
  ModuleSettingsPanel,
  OrganizationProfilePanel,
  PoliciesTermsPanel,
  ReferenceNumberingPanel,
  RolesPermissionsPanel,
  SecuritySettingsPanel,
  SystemMaintenancePanel,
  SystemPreferencesPanel,
  TaxesDeductionsPanel,
  UserManagementPanel,
} from './settingsPanels'

const panels: Record<string, () => ReactElement> = {
  'organization-profile': OrganizationProfilePanel,
  'system-preferences': SystemPreferencesPanel,
  'fiscal-year-periods': FiscalYearPanel,
  'reference-numbering': ReferenceNumberingPanel,
  'chart-of-accounts': ChartOfAccountsPanel,
  'accounting-rules': AccountingRulesPanel,
  'taxes-deductions': TaxesDeductionsPanel,
  'bank-accounts': BankAccountsPanel,
  'membership-configuration': MembershipConfigurationPanel,
  'capital-share-contributions': CapitalShareContributionsPanel,
  'dividends-patronage': DividendsPatronagePanel,
  'policies-terms': PoliciesTermsPanel,
  'user-management': UserManagementPanel,
  'roles-permissions': RolesPermissionsPanel,
  'activity-logs': ActivityLogsPanel,
  'security-settings': SecuritySettingsPanel,
  'data-backup': DataBackupPanel,
  'import-export': ImportExportPanel,
  'module-settings': ModuleSettingsPanel,
  'system-maintenance': SystemMaintenancePanel,
}

export function SettingsSectionPage() {
  const { slug = '' } = useParams()
  const meta = findSettingsItem(slug)
  const Panel = panels[slug]

  if (!meta || !Panel) {
    return <EmptyState title="Unknown setting" description="Return to Settings and choose a valid item from the hub." />
  }

  return <Panel />
}