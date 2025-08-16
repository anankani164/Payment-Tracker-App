# from repo root
git apply <<'PATCH'
*** Begin Patch
*** Update File: backend/server.js
@@
   const rows = query(db, `
@@
   `, params).map(r => {
@@
     return {
       ...r,
       amount_paid,
       balance,
       overdue,
       total_base, amount_paid_base: paid_base, balance_base,
       client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null,
-      created_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null
+      created_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
+      // --- Back-compat aliases for existing UI ---
+      paid: amount_paid,                          // UI column "Paid"
+      recorded_by: r.created_by_name || '',       // UI column "Recorded By"
+      created: r.created_at                        // UI column "Created"
     };
   });
   res.json(rows);
 });
@@
   const pays = query(db, `
@@
-  `, [id]).map(p => ({
-    ...p,
-    recorded_by_user: p.created_by_id ? { id:p.created_by_id, name:p.created_by_name, email:p.created_by_email } : null
-  }));
+  `, [id]).map(p => ({
+    ...p,
+    recorded_by_user: p.created_by_id ? { id:p.created_by_id, name:p.created_by_name, email:p.created_by_email } : null,
+    // Back-compat for UI
+    recorded_by: p.created_by_name || ''
+  }));
@@
   res.json({
     ...inv,
     amount_paid,
     balance,
     total_base, amount_paid_base, balance_base,
     client: inv.client_id ? { id:inv.client_id, name:inv.client_name, email:inv.client_email } : null,
-    created_by_user: inv.created_by_id ? { id:inv.created_by_id, name:inv.created_by_name, email:inv.created_by_email } : null,
+    created_by_user: inv.created_by_id ? { id:inv.created_by_id, name:inv.created_by_name, email:inv.created_by_email } : null,
+    // Back-compat alias for UI header
+    recorded_by: inv.created_by_name || '',
     payments: pays
   });
 });
@@
   const rows = query(db, `
@@
-  `, pr).map(r => ({
-    ...r,
-    amount_base: Number(r.amount||0) * coalesceRate(r.rate_to_base || r.invoice_rate_to_base),
-    recorded_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
-    client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null
-  }));
+  `, pr).map(r => ({
+    ...r,
+    amount_base: Number(r.amount||0) * coalesceRate(r.rate_to_base || r.invoice_rate_to_base),
+    recorded_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
+    client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null,
+    // Back-compat alias for UI
+    recorded_by: r.created_by_name || ''
+  }));
   res.json(rows);
 });
*** End Patch
PATCH
