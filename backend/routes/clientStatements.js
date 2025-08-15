export default function registerClientStatementRoutes(app, db, auth){
  app.get('/api/clients/:id/statement', auth, (req, res) => {
    const raw = (req.params.id ?? '').trim();
    if (!/^\d+$/.test(raw)) return res.status(400).json({ error: 'Invalid client id' });
    const clientId = Number(raw);

    function allRows(query, params){
      const stmt = db.prepare(query);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }

    const clientStmt = db.prepare(`SELECT id, name, email, phone FROM clients WHERE id = ? LIMIT 1`);
    clientStmt.bind([clientId]);
    let client = null;
    if (clientStmt.step()) client = clientStmt.getAsObject();
    clientStmt.free();
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const invoices = allRows(`SELECT id, title, description, total, created_at, due_date FROM invoices WHERE client_id = ?`, [clientId]);
    const payments = allRows(`SELECT id, amount, percent, method, note, created_at, invoice_id FROM payments WHERE client_id = ?`, [clientId]);

    const entries = [];
    for (const i of invoices){
      entries.push({ type:'Invoice', ref:i.id, date: i.created_at || i.due_date || null, description:i.title || i.description || '', amount: Number(i.total||0), invoice_id:i.id });
    }
    for (const p of payments){
      entries.push({ type:'Payment', ref:p.id, date: p.created_at || null, description:p.note || p.method || '', amount: -Number(p.amount||0), invoice_id:p.invoice_id || null });
    }
    entries.sort((a,b)=>{
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      if (ad !== bd) return ad - bd;
      if (a.type === b.type) return 0;
      return a.type === 'Invoice' ? -1 : 1;
    });

    let running = 0, totalInvoiced = 0, totalPaid = 0;
    const withRunning = entries.map(e => {
      if (e.type === 'Invoice') totalInvoiced += Math.abs(e.amount);
      if (e.type === 'Payment') totalPaid += Math.abs(e.amount);
      running += e.amount;
      return { ...e, running };
    });

    res.json({ client, totals:{ invoiced: totalInvoiced, paid: totalPaid, balance: totalInvoiced - totalPaid }, entries: withRunning });
  });
}
