export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json([
      { id: '12345', date: '2023-01-15', status: 'Delivered', total: '$120.50' },
      { id: '12346', date: '2023-02-20', status: 'Processing', total: '$75.25' }
    ]);
  }

  if (req.method === 'POST') {
    const newOrder = req.body;
    return res.status(201).json({
      message: 'Order created',
      order: newOrder
    });
  }
}
