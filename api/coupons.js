export default function handler(req, res) {
  res.status(200).json([
    { code: 'SAVE10', discount: '10%' },
    { code: 'FREESHIP', discount: 'Free Shipping' }
  ]);
}
