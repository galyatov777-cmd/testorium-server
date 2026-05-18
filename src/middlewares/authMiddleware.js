import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
	// Пропускаем preflight без проверки токена
	if (req.method === 'OPTIONS') {
		return next();
	}

	try {
		const header = req.headers.authorization;

		if (!header) {
			return res.status(401).json({ message: 'No token' });
		}

		const token = header.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ message: 'Invalid token' });
	}
};

export default authMiddleware;
