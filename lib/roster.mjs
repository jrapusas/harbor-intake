/** Demo contact roster — agent must lookup_contact, not invent roles. */

export const ROSTER = [
  { id: 'david', name: 'David Nguyen', role: 'Customs lead', queue: 'Import compliance' },
  { id: 'maria', name: 'Maria Chen', role: 'Warehouse planner', queue: 'WMS ops' },
  { id: 'alex', name: 'Alex Rivera', role: 'Carrier relations', queue: 'Freight desk' },
  { id: 'sam', name: 'Sam Okonkwo', role: 'Warehouse lead', queue: 'Floor ops' },
];

export function lookupContact(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { found: false, matches: [] };
  const matches = ROSTER.filter(
    (p) => p.name.toLowerCase().includes(q) || q.includes(p.name.split(' ')[0].toLowerCase()),
  );
  if (matches.length === 1) {
    return { found: true, contact: matches[0], matches };
  }
  if (matches.length > 1) {
    return { found: true, ambiguous: true, matches };
  }
  return { found: false, matches: [] };
}
