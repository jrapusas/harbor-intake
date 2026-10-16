import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anon);

const supabase = supabaseConfigured ? createClient(url, anon) : null;

const LS_KEY = 'harbor_intakes_v1';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export async function listIntakes() {
  if (supabase) {
    const { data, error } = await supabase
      .from('intakes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  return readLocal();
}

export async function saveIntake(row) {
  const payload = {
    title: row.title,
    owner: row.owner,
    priority: row.priority,
    due_date: row.due_date,
    notes: row.notes,
    raw_text: row.raw_text,
  };

  if (supabase) {
    const { data, error } = await supabase.from('intakes').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const item = { id, created_at, ...payload };
  const rows = readLocal();
  rows.unshift(item);
  writeLocal(rows);
  return item;
}

export function storageMode() {
  return supabaseConfigured ? 'supabase' : 'local';
}
