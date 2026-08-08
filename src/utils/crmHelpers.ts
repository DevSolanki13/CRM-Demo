import { User, UserRole, Deal } from '../types/crm';

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDaysDifference(dateString: string): number {
  if (!dateString) return 0;
  const target = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'Admin';
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'Admin';
}

export function canViewAllLeads(role: UserRole): boolean {
  return role === 'Admin' || role === 'Manager';
}

export function filterByRole<T extends { ownerId?: string }>(items: T[], currentUser: User): T[] {
  if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
    return items;
  }
  // Sales Rep only sees their assigned items
  return items.filter(item => item.ownerId === currentUser.id);
}

// Simple CSV Exporter
export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const val = (row as any)[header];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Simple CSV Parser
export function parseCSVText(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    result.push(obj);
  }

  return result;
}
