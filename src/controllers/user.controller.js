import * as userService from '../services/user.service.js';

export const updateMe = async (req, res) => {
	try {
		console.log('BODY:', req.body);
		console.log('USER:', req.user);

		const user = await userService.updateMe(req.user.id, req.body);

		res.json(user);
	} catch (err) {
		console.error(err);

		res.status(400).json({
			message: err.message,
		});
	}
};
