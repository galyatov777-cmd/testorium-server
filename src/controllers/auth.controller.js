import * as authService from '../services/auth.service.js';

export const register = async (req, res) => {
	try {
		const data = await authService.register(req.body);

		res.status(201).json(data);
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

export const login = async (req, res) => {
	try {
		const data = await authService.login(req.body);

		res.json(data);
	} catch (err) {
		res.status(400).json({
			message: err.message,
		});
	}
};

export const me = async (req, res) => {
	try {
		const user = await authService.me(req.user.id);

		res.json(user);
	} catch (err) {
		res.status(404).json({
			message: err.message,
		});
	}
};
