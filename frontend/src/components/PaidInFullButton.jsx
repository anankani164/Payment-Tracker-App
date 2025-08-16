// frontend/src/components/PaidInFullButton.jsx
import React, { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Minimal, drop-in button to record a full payment for an invoice.
 * Usage (inside your Invoices row):
 *   import PaidInFullButton from '../components/PaidInFullButton';
 *   <PaidInFullButton inv={inv} className="btn pill" onSaved={load} />
 *
 * Props:
 *  - inv: invoice row object (must have id, total, paid/balance fields)
 *  - className: string for styling (use your existing button classes)
 *  - confirm: boolean (default true) to show a confirm dialog
 *  - onSaved: optional callback invoked after success (e.g., your load())
 */
export default function PaidInFullButton({ inv, className = 'btn pill', confirm = true, onSaved }){
  const [saving, setSaving] = useState(false);

  const fmt = (n, cur='GHS') => `${cur} ${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const computeBalance = (row) => {
    const paid = Number(row?.paid ?? row?.amount_paid ?? row?.amount_paid_in_inv ?? 0);
    const total = Number(row?.total ?? 0);
    return Number(row?.balance ?? (total - paid));
  };

  const handle = useCallback(async () => {
    if (!inv || saving) return;
    const balance = computeBalance(inv);
    const currency = inv.currency || inv.currency_code || 'GHS';
    if (balance <= 0) return;
    if (confirm){
      const ok = window.confirm(`Record full payment of ${fmt(balance, currency)} for invoice #${inv.id}?`);
      if (!ok) return;
    }
    try {
      setSaving(true);
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: inv.id,
          amount: balance,
          method: 'Paid in Full',
          note: 'One-click full payment'
        })
      });
      if (!res.ok){
        const msg = await res.text().catch(()=> 'Failed to record payment');
        alert(msg);
        return;
      }
      if (typeof onSaved === 'function') await onSaved();
    } finally {
      setSaving(false);
    }
  }, [inv, saving, onSaved, confirm]);

  return (
    <button className={className} onClick={handle} disabled={saving || computeBalance(inv) <= 0}>
      {saving ? 'Saving…' : 'Paid in Full'}
    </button>
  );
}
