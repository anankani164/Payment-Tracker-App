// Express route example adding 'recordedBy' and 'clientName' fields
router.post('/payments', authMiddleware, async (req, res) => {
  const { invoiceId, amount } = req.body;
  const recordedBy = req.user.username;
  const clientName = await getClientFromInvoice(invoiceId);
  // Save payment with recordedBy and clientName
});
