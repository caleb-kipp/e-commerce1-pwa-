export default function handler(req, res) {
  res.status(200).json([
    { product: 'Coffee Beans', rating: 5, comment: 'Excellent quality!' }
  ]);
}
