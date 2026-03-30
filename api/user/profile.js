export default function handler(req, res) {
  res.status(200).json({
    name: 'John Doe',
    email: 'john.doe@example.com',
    memberSince: 'January 2023',
    avatar: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png'
  });
}
