/** Demo paste + canned agent output (no API spend). */

export const SAMPLES = [
  {
    id: 'agentic-showcase',
    label: '★ Agentic showcase (top 7)',
    paste: `PORT OPS — Monday triage (forwarded thread)

1) CUSTOMS: BOL mismatch container HLCU-9034412 — @David Nguyen loop forwarder, release by Tuesday EOD.
2) WAREHOUSE: Cycle count off 240 units SKU 99012 — @Sam Okonkwo reconcile before Thursday.
3) CARRIER: Missing POD for load ORD-2281 — @Alex Rivera chase dispatcher today.

Update Maria's shared tracker when each closes.`,
    run: {
      summary:
        'Split three tasks, grounded owners from roster, classified customs route, validated after one fix — ready for your edit.',
      model: 'sample',
      classification: { category: 'customs', queue: 'Import compliance' },
      splits: [
        {
          title: 'Resolve BOL mismatch — HLCU-9034412',
          owner: 'David Nguyen',
          priority: 'high',
          due_date: 'Tuesday EOD',
          notes: 'Forwarder + customs release LA/LB.',
        },
        {
          title: 'Reconcile cycle count SKU 99012 (240 units)',
          owner: 'Sam Okonkwo',
          priority: 'medium',
          due_date: 'Thursday',
          notes: 'WMS variance before board prep.',
        },
        {
          title: 'Obtain POD for load ORD-2281',
          owner: 'Alex Rivera',
          priority: 'high',
          due_date: 'Today',
          notes: 'Carrier dispatcher follow-up.',
        },
      ],
      intake: {
        title: 'Resolve BOL mismatch — HLCU-9034412',
        owner: 'David Nguyen',
        priority: 'high',
        due_date: 'Tuesday EOD',
        notes: 'Forwarder + customs release LA/LB. Primary task from split.',
      },
      trace: [
        { kind: 'tool', tool: 'split_intakes', result: { ok: true, count: 3 } },
        {
          kind: 'tool',
          tool: 'lookup_contact',
          input: { query: 'David Nguyen' },
          result: {
            found: true,
            contact: { name: 'David Nguyen', role: 'Customs lead', queue: 'Import compliance' },
          },
        },
        {
          kind: 'tool',
          tool: 'lookup_contact',
          input: { query: 'Sam Okonkwo' },
          result: {
            found: true,
            contact: { name: 'Sam Okonkwo', role: 'Warehouse lead', queue: 'Floor ops' },
          },
        },
        { kind: 'tool', tool: 'extract_intake', result: { ok: true } },
        {
          kind: 'tool',
          tool: 'classify_intake',
          result: { ok: true, category: 'customs', queue: 'Import compliance' },
        },
        {
          kind: 'tool',
          tool: 'validate_intake',
          result: { valid: false, errors: ['owner required'] },
        },
        { kind: 'tool', tool: 'extract_intake', retry: true, result: { ok: true } },
        { kind: 'tool', tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'short-shipment',
    label: 'Warehouse · short shipment',
    paste: `From: warehouse lead — need someone to call supplier re: short shipment on SKU 4421,
urgent before Friday board prep. Also update the shared tracker Maria uses.`,
    run: {
      summary: 'Intake parsed: urgent supplier follow-up before Friday board prep.',
      model: 'sample',
      intake: {
        title: 'Call supplier about short shipment SKU 4421',
        owner: 'Warehouse lead',
        priority: 'urgent',
        due_date: 'Friday',
        notes: 'Update shared tracker Maria uses; board prep dependency.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Call supplier about short shipment SKU 4421' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'customs-hold',
    label: 'Customs · documentation hold',
    paste: `CUSTOMS ALERT — BOL mismatch on container HLCU-9034412 (electronics).
Broker says commercial invoice weight differs from manifest. Release blocked at LA/LB.
@David Nguyen please loop in freight forwarder and legal if needed. Need path to release by EOD Tuesday.`,
    run: {
      summary: 'Intake parsed: customs release blocked on container HLCU-9034412; broker and forwarder follow-up.',
      model: 'sample',
      intake: {
        title: 'Resolve BOL mismatch — container HLCU-9034412',
        owner: 'David Nguyen',
        priority: 'high',
        due_date: 'Tuesday EOD',
        notes: 'Commercial invoice vs manifest weight; LA/LB hold. Involve freight forwarder and legal if needed.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Resolve BOL mismatch — container HLCU-9034412' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'wms-outage',
    label: 'IT · WMS scan failures',
    paste: `WMS ticket #8841 — handhelds in Zone B quit syncing after last night's patch.
Floor can't confirm picks; supervisors are writing on clipboards. Not customer-facing yet but will be by afternoon peak.
IT on-call is Vikram; need rollback or hotfix plan. Medium urgency unless peak slips.`,
    run: {
      summary: 'Intake parsed: Zone B WMS sync failure after patch; rollback or hotfix before peak.',
      model: 'sample',
      intake: {
        title: 'Restore Zone B WMS handheld sync (ticket #8841)',
        owner: 'Vikram (IT on-call)',
        priority: 'high',
        due_date: 'Before afternoon peak',
        notes: 'Post-patch regression; supervisors on clipboards. Escalate if peak at risk.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Restore Zone B WMS handheld sync (ticket #8841)' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'carrier-window',
    label: 'Transport · reschedule pickup',
    paste: `FYI only — carrier XPO moved our dock pickup from Thu 14:00 to Fri 08:00 (driver shortage).
No action unless inbound PO 77102 misses the production slot. If so ping scheduling — owner is Rosa.`,
    run: {
      summary: 'Intake parsed: monitor XPO pickup slip; act only if PO 77102 production slot is at risk.',
      model: 'sample',
      intake: {
        title: 'Confirm PO 77102 still covered after XPO pickup delay',
        owner: 'Rosa (scheduling)',
        priority: 'low',
        due_date: 'Thursday',
        notes: 'Pickup moved Thu 14:00 → Fri 08:00. No change unless production slot slips.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Confirm PO 77102 still covered after XPO pickup delay' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'safety-near-miss',
    label: 'Safety · dock near-miss',
    paste: `NEAR MISS Dock 3 — forklift reversed without spotter; no injury.
OSHA log entry required within 24h. Safety committee wants photos and witness statements.
Assign to EHS lead (Pat). Treat as urgent compliance.`,
    run: {
      summary: 'Intake parsed: urgent EHS follow-up for Dock 3 near-miss and OSHA logging.',
      model: 'sample',
      intake: {
        title: 'OSHA log and witness pack — Dock 3 near-miss',
        owner: 'Pat (EHS lead)',
        priority: 'urgent',
        due_date: 'Within 24 hours',
        notes: 'Forklift without spotter; photos and witness statements for safety committee.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'OSHA log and witness pack — Dock 3 near-miss' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'sla-breach',
    label: 'Customer · SLA expedite',
    paste: `Customer Acme Retail — order 8842 missed 2-day ship promise (stuck in QC hold).
AM wants same-day expedited pick + carrier upgrade. Billing may need goodwill credit.
Owner: account team lead (Jordan). Due today if we want to save the renewal conversation.`,
    run: {
      summary: 'Intake parsed: same-day expedite for Acme order 8842; possible goodwill credit.',
      model: 'sample',
      intake: {
        title: 'Expedite order 8842 — Acme Retail SLA recovery',
        owner: 'Jordan (account team lead)',
        priority: 'urgent',
        due_date: 'Today',
        notes: 'QC hold caused miss; expedited pick + carrier upgrade; coordinate goodwill credit with billing.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Expedite order 8842 — Acme Retail SLA recovery' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'messy-slack',
    label: 'Slack · vague floor note',
    paste: `hey can someone look at the thing with the labels on aisle 12?? pallets look fine but scan says wrong location
thx - j`,
    run: {
      summary: 'Intake parsed: investigate aisle 12 label/location mismatch in WMS.',
      model: 'sample',
      intake: {
        title: 'Investigate aisle 12 label vs scan location mismatch',
        owner: 'Unassigned — floor ops',
        priority: 'medium',
        due_date: '',
        notes: 'Reporter: j. Physical pallets OK; system shows wrong location.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Investigate aisle 12 label vs scan location mismatch' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
  {
    id: 'cycle-count',
    label: 'Inventory · cycle count variance',
    paste: `Cycle count wave 7 — SKU 99012 short 240 units in system vs physical (freezer aisle).
Finance wants root cause before month-end close (next Wednesday).
Inventory control owns reconciliation; loop receiving if ASN error suspected.`,
    run: {
      summary: 'Intake parsed: reconcile SKU 99012 variance before month-end close.',
      model: 'sample',
      intake: {
        title: 'Reconcile cycle count variance SKU 99012 (240 units)',
        owner: 'Inventory control',
        priority: 'medium',
        due_date: 'Before Wednesday (month-end close)',
        notes: 'Wave 7; freezer aisle. Check receiving/ASN if discrepancy persists.',
      },
      trace: [
        { tool: 'extract_intake', input: { title: 'Reconcile cycle count variance SKU 99012 (240 units)' }, result: { ok: true } },
        { tool: 'validate_intake', result: { valid: true } },
      ],
    },
  },
];

export const DEFAULT_SAMPLE_ID = 'agentic-showcase';

export function getSample(id) {
  return SAMPLES.find((s) => s.id === id) || SAMPLES[0];
}

export function loadSampleRun(id = DEFAULT_SAMPLE_ID) {
  const sample = getSample(id);
  return Promise.resolve({ ...sample.run });
}
