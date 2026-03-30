export default function handler(req, res) {
  res.status(200).json([
    { orderId: '12345', status: 'Pending' }
  ]);
}
