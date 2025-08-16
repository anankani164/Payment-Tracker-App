import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- state ---
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // --- helpers (local + safe) ---
  const formatMoney = (value, cur = 'GHS') => {
    const n = Number(value || 0);
    return `${cur} ${n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const normalizeInvoice = (raw) => {
    const inv = raw?.invoice ?? raw ?? {};
    const total = Number(inv.total ?? inv.amount_total ?? 0);
    const paid =
      Number(inv.paid ?? inv.amount_paid ?? inv.paid_total ?? 0) || 0;
    return {
      id: inv.id ?? Number(id),
      clientId: inv.client_id ?? inv.clientId,
      clientName:
        inv.clientName ?? inv.client_name ?? inv.client?.name ?? '',
      status: inv.status ?? 'pending',
      total,
      paid,
      balance: inv.balance ?? Math.max(0, total - paid),
      due_date: inv.due_date ?? inv.dueDate ?? null,
      created_at: inv.created ?? inv.created_at ?? null,
      currency: inv.currency ?? 'GHS',
    };
  };

  // shareable loader
  const load = useCallback(async () => {
    const r = await apiFetch(`/api/invoices/${id}`);
    const data = await r.json();
    setInvoice(normalizeInvoice(data));
    setPayments(data?.payments ?? data?.pays ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // --- actions ---
  async function addPayment(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const body = {
        invoice_id: invoice?.id ?? Number(id),
        amount,
        percent,
        method,
        note,
      };
      const r = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const msg = (await r.text()) || 'Failed to add payment';
        alert(msg);
      } else {
        // clear & refresh
        setAmount('');
        setPercent('');
        setMethod('');
        setNote('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deletePayment(pid) {
    if (!window.confirm('Delete this payment?')) return;
    const r = await apiFetch(`/api/payments/${pid}`, { method: 'DELETE' });
    if (r.ok) await load();
  }

  async function markPaid() {
    if (!invoice) return;
    const r = await apiFetch(`/api/invoices/${invoice.id}/mark-paid`, {
      method: 'POST',
    });
    if (r.ok) await load();
  }

  if (!invoice) {
    return (
      <div className="container">
        <h2>Invoice</h2>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Title */}
      <div className="page-head" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <h2 style={{margin:0}}>Invoice #{invoice.id}</h2>
        <button className="btn btn-ghost pill" onClick={markPaid}>Mark as paid</button>
      </div>

      {/* Summary card */}
      <div className="card" style={{marginTop:12}}>
        <div className="grid two" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
          <div>
            <div style={{marginBottom:8}}><strong>Client:</strong>{' '}
              {invoice.clientId ? (
                <Link to={`/clients/${invoice.clientId}`}>{invoice.clientName || '—'}</Link>
              ) : (
                invoice.clientName || '—'
              )}
            </div>
            <div style={{marginBottom:8}}><strong>Status:</strong>{' '}
              <span className={`badge ${invoice.status}`}>{invoice.status}</span>
            </div>
            <div style={{marginBottom:8}}><strong>Paid</strong><br/>{formatMoney(invoice.paid, invoice.currency)}</div>
            <div><strong>Due date</strong><br/>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
          </div>
          <div>
            <div style={{marginBottom:8}}><strong>Total</strong><br/>{formatMoney(invoice.total, invoice.currency)}</div>
            <div><strong>Balance</strong><br/>{formatMoney(invoice.balance, invoice.currency)}</div>
          </div>
        </div>
      </div>

      {/* Payments table */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Payments</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Percent</th>
              <th>Method</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments?.length ? (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                  <td>{formatMoney(p.amount ?? 0, invoice.currency)}</td>
                  <td>{p.percent ? `${p.percent}%` : '—'}</td>
                  <td>{p.method || '—'}</td>
                  <td>{p.note || '—'}</td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn btn-danger pill" onClick={() => deletePayment(p.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="muted">No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add payment */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Add payment</h3>
        <form onSubmit={addPayment}>
          <div className="row" style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12}}>
            <input
              className="input"
              placeholder={`Amount (${invoice.currency})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className="input"
              placeholder="Percent (%)"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
            <input
              className="input"
              placeholder="Method (optional)"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
            <input
              className="input"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:12}}>
              <Link to="/invoices" className="btn btn-link">Back</Link>
              <button className="btn btn-primary pill" disabled={busy}>Add payment</button>
            </div>
          </div>
          <div className="muted" style={{marginTop:8}}>
            Tip: Fill either <strong>Amount</strong> or <strong>Percent</strong>. If both are filled, Amount wins.
          </div>
        </form>
      </div>
    </div>
  );
}
