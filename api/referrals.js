export default function handler(req, res) {
  res.status(200).json({
    referrals: 5,
    earnings: '$50'
  });
}
