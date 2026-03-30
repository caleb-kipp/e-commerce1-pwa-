export default function handler(req, res) {
  res.status(200).json([
    { product: 'Wireless Mouse', price: '$25' }
  ]);
}
