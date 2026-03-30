export default function handler(req, res) {
  res.status(200).json([
    { service: 'Monthly Coffee Delivery', status: 'Active' }
  ]);
}
