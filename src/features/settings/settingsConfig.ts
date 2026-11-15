export type SettingsItem = {
  title: string
  slug: string
  description: string
}

export type SettingsGroup = {
  title: string
  items: SettingsItem[]
}

export function settingsHref(slug: string) {
  return `/admin/settings/${slug}`
}

export const settingsGroups: SettingsGroup[] = [
  {
    title: 'General Settings',
    items: [
      {
        title: 'Organization Profile',
        slug: 'organization-profile',
        description: 'Cooperative legal name, address, and contact details.',
      },
      {
        title: 'System Preferences',
        slug: 'system-preferences',
        description: 'Locale, currency display, and date format.',
      },
      {
        title: 'Fiscal Year & Periods',
        slug: 'fiscal-year-periods',
        description: 'Fiscal calendar for reporting and closing.',
      },
      {
        title: 'Reference Numbering',
        slug: 'reference-numbering',
        description: 'Prefixes for receipts, dispatches, and loans.',
      },
    ],
  },
  {
    title: 'Accounting & Finance Settings',
    items: [
      {
        title: 'Chart of Accounts',
        slug: 'chart-of-accounts',
        description: 'GL account codes used by collections and contributions.',
      },
      {
        title: 'Accounting Rules',
        slug: 'accounting-rules',
        description: 'Posting rules and journal controls.',
      },
      {
        title: 'Taxes & Deductions',
        slug: 'taxes-deductions',
        description: 'Default tax and withholding rates.',
      },
      {
        title: 'Bank Accounts',
        slug: 'bank-accounts',
        description: 'Cash and bank accounts linked to the ledger.',
      },
    ],
  },
  {
    title: 'Cooperative & Membership Settings',
    items: [
      {
        title: 'Membership Configuration',
        slug: 'membership-configuration',
        description: 'Membership types and application rules.',
      },
      {
        title: 'Capital Share & Contributions',
        slug: 'capital-share-contributions',
        description: 'Contribution categories and share capital defaults.',
      },
      {
        title: 'Dividends & Patronage',
        slug: 'dividends-patronage',
        description: 'Patronage and dividend policy parameters.',
      },
      {
        title: 'Policies & Terms',
        slug: 'policies-terms',
        description: 'Published membership and loan policy text.',
      },
    ],
  },
  {
    title: 'Users & Access',
    items: [
      {
        title: 'User Management',
        slug: 'user-management',
        description: 'Staff and member login accounts.',
      },
      {
        title: 'Roles & Permissions',
        slug: 'roles-permissions',
        description: 'Role catalog and permission mapping (read-only).',
      },
      {
        title: 'Activity Logs',
        slug: 'activity-logs',
        description: 'Audit trail from system actions.',
      },
      {
        title: 'Security Settings',
        slug: 'security-settings',
        description: 'Session and access policy flags.',
      },
    ],
  },
  {
    title: 'Integration & System',
    items: [
      {
        title: 'Data Backup',
        slug: 'data-backup',
        description: 'Backup guidance for your Supabase project.',
      },
      {
        title: 'Import / Export',
        slug: 'import-export',
        description: 'Export member list for spreadsheets.',
      },
      {
        title: 'Module Settings',
        slug: 'module-settings',
        description: 'Enable POS fare types and module toggles.',
      },
      {
        title: 'System Maintenance',
        slug: 'system-maintenance',
        description: 'Environment and migration reference.',
      },
    ],
  },
]

export function findSettingsItem(slug: string): SettingsItem | undefined {
  for (const group of settingsGroups) {
    const item = group.items.find((i) => i.slug === slug)
    if (item) return item
  }
  return undefined
}