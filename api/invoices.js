export default function handler(req, res) {
  res.status(200).json([
    { id: 'INV001', amount: '$120.50', status: 'Paid' }
  ]);
}
