export default function handler(req, res) {
  res.status(200).json([
    { code: 'GIFT100', value: 100 }
  ]);
}
