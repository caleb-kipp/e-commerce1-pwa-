export default function handler(req, res) {
  res.status(200).json({
    points: 1200,
    tier: 'Gold'
  });
}
