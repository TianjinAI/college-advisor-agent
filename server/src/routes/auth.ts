import { Router } from 'express';
import { verifyLogin, issueToken } from '../auth/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = await verifyLogin(username, password);
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = issueToken(user);
  res.json({
    token,
    user: { userId: user.userId, username: user.username, displayName: user.displayName },
  });
});

router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
