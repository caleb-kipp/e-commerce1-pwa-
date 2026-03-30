export default function handler(req, res) {
  res.status(200).json({
    theme: 'light',
    notifications: true
  });
}
