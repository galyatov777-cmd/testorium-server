import { Router } from 'express';

import authMiddleware from '../middlewares/authMiddleware.js';

import {
	createTest,
	getAllTests,
	getTestById,
	startTest,
	submitAnswer,
	getMyTests,
} from '../controllers/tests.controller.js';

const router = Router();

router.post('/', authMiddleware, createTest);

router.post('/start', startTest);
router.post('/answer', submitAnswer);

router.get('/', getAllTests);
router.get('/my', authMiddleware, getMyTests);
router.get('/:id', getTestById);

export default router;
