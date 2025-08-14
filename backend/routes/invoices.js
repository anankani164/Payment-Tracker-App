// Express route example adding 'recordedBy' field
router.post('/invoices', authMiddleware, async (req, res) => {
  const { client, amount } = req.body;
  const recordedBy = req.user.username;
  // Save invoice with recordedBy
});
