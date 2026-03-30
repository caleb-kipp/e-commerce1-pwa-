export default function handler(req, res) {
  res.status(200).json([
    { id: 1, location: 'Nairobi, Kenya', default: true },
    { id: 2, location: 'Thika, Kenya', default: false }
  ]);
}
