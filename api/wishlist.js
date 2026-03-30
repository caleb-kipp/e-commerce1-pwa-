export default function handler(req, res) {
  res.status(200).json([
    { product: 'Laptop', price: '$800' }
  ]);
}
