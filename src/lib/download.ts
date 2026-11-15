export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildMemberStatementCsv(input: {
  memberName: string
  memberCode: string
  email: string
  shareCapital: string
  contributions: { contributed_at: string; amount: string; receipt_reference: string | null; notes?: string | null }[]
}): string {
  const lines: string[] = []
  const today = new Date().toISOString().slice(0, 10)

  lines.push('KAAGAPAY Cooperative - Member Statement')
  lines.push(`Generated,${today}`)
  lines.push(`Member,${escapeCsvCell(input.memberName)}`)
  lines.push(`Member code,${escapeCsvCell(input.memberCode)}`)
  lines.push(`Email,${escapeCsvCell(input.email)}`)
  lines.push(`Share capital total (PHP),${input.shareCapital}`)
  lines.push('')
  lines.push('Contributions')
  lines.push('Date,Amount (PHP),Receipt reference,Notes')

  for (const row of input.contributions) {
    const date = new Date(row.contributed_at).toLocaleDateString('en-CA')
    lines.push(
      [date, row.amount, escapeCsvCell(row.receipt_reference ?? ''), escapeCsvCell(row.notes ?? '')].join(','),
    )
  }

  if (input.contributions.length === 0) {
    lines.push(',,No contribution rows for this member,')
  }

  return lines.join('\r\n')
}

export function memberStatementFilename(memberCode: string) {
  const safe = memberCode.replace(/[^\w-]+/g, '_') || 'member'
  return `kaagapay-statement-${safe}-${new Date().toISOString().slice(0, 10)}.csv`
}