export default function handler(req, res) {
  res.status(200).json([
    { message: 'Your order has been shipped!' }
  ]);
}
