import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

function fmtMoney(n, cur = 'GHS') {
  const v = Number(n || 0);
  return `${cur} ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [payingId, setPayingId] = useState(null); // lock per-row while recording full payment

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await apiFetch('/api/invoices');
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to load invoices');
        throw new Error(msg);
      }
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // One-click: record full remaining balance as a payment
  const payInFull = useCallback(async (inv) => {
    if (!inv) return;
    const paid = Number(inv.paid ?? inv.amount_paid ?? inv.amount_paid_in_inv ?? 0);
    const total = Number(inv.total ?? 0);
    const balance = Number(inv.balance ?? (total - paid));
    const currency = inv.currency || inv.currency_code || 'GHS';

    if (balance <= 0) return;
    if (!window.confirm(`Record full payment of ${fmtMoney(balance, currency)} for invoice #${inv.id}?`)) return;

    try {
      setPayingId(inv.id);
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: inv.id,           // backend also accepts invoiceId, but we pass invoice_id
          amount: balance,
          method: 'Paid in Full',
          note: 'One-click full payment'
        })
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to record payment');
        alert(msg);
        return;
      }
      // Optimistically update the row locally (no UI layout changes)
      setInvoices(prev => prev.map(row => {
        if (row.id !== inv.id) return row;
        const rowPaid = Number(row.paid ?? row.amount_paid ?? row.amount_paid_in_inv ?? 0);
        return {
          ...row,
          paid: rowPaid + balance,
          balance: 0,
          status: 'paid'
        };
      }));
    } finally {
      setPayingId(null);
    }
  }, []);

  const rows = useMemo(() => {
    return invoices.map(inv => {
      const paid = Number(inv.paid ?? inv.amount_paid ?? inv.amount_paid_in_inv ?? 0);
      const total = Number(inv.total ?? 0);
      const balance = Number(inv.balance ?? (total - paid));
      const currency = inv.currency || inv.currency_code || 'GHS';
      return { ...inv, paid, total, balance, currency };
    });
  }, [invoices]);

  return (
    <div className="container">
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Invoices</h2>
        {/* Keep your existing “Add Invoice” link/button if you have one */}
        <Link to="/invoices/new" className="btn btn-primary pill">Add Invoice</Link>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="muted" style={{ padding: 12 }}>Loading…</div>
        ) : err ? (
          <div className="error" style={{ padding: 12 }}>{err}</div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Client</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Title</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Paid</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Balance</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Due</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(inv => (
                <tr key={inv.id}>
                  <td style={{ padding: '8px 12px' }}>#{inv.id}</td>
                  <td style={{ padding: '8px 12px' }}>{inv.clientName || inv.client?.name || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{inv.title || inv.description || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtMoney(inv.total, inv.currency)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtMoney(inv.paid, inv.currency)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtMoney(inv.balance, inv.currency)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={`badge ${inv.status || ''}`}>{inv.status || 'pending'}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {/* Keep your existing actions here (View / Export / Delete etc.) */}
                    <Link className="btn pill" to={`/invoices/${inv.id}`}>View</Link>

                    {/* NEW: Paid in Full (no layout changes) */}
                    <button
                      className="btn pill"
                      disabled={Number(inv.balance) <= 0 || payingId === inv.id}
                      onClick={() => payInFull(inv)}
                      title="Record payment equal to the current balance"
                    >
                      {payingId === inv.id ? 'Saving…' : 'Paid in Full'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ padding: 12 }}>No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
