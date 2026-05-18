import * as testsService from '../services/tests.service.js';

export const createTest = async (req, res) => {
	try {
		const data = await testsService.createFullTest({
			...req.body,
			author_id: req.user.id,
		});

		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const getAllTests = async (req, res) => {
	try {
		const tests = await testsService.getAllTests();

		res.json(tests);
	} catch (err) {
		res.status(500).json({
			error: err.message,
		});
	}
};

export const getTestById = async (req, res) => {
	try {
		const test = await testsService.getTestById(req.params.id);

		if (!test) {
			return res.status(404).json({ message: 'Test not found' });
		}

		res.json(test);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const startTest = async (req, res) => {
	try {
		const data = await testsService.startTest({
			user_id: req.user.id,
			test_id: req.body.test_id,
		});

		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const submitAnswer = async (req, res) => {
	try {
		const data = await testsService.submitAnswer(req.body);
		res.json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

export const getMyTests = async (req, res) => {
	try {
		console.log('USER:', req.user);
		const tests = await testsService.getTestsByUser(req.user.id);
		res.json(tests);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};
