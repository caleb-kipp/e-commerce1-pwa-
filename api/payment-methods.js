export default function handler(req, res) {
  res.status(200).json([
    { type: 'Visa', last4: '1234' },
    { type: 'M-Pesa', phone: '+254712345678' }
  ]);
}
