export default function handler(req, res) {
  res.status(200).json({
    balance: 2500,
    currency: 'KES'
  });
}
