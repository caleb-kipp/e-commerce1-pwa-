export default function handler(req, res) {
  res.status(200).json([
    { id: 'TICKET001', status: 'Open' }
  ]);
}
