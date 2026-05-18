import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

router.patch('/me', authMiddleware, userController.updateMe);

export default router;
