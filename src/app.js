import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import testsRoutes from './routes/tests.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
var options = {
	origin: '*',
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	preflightContinue: false,
	optionsSuccessStatus: 204,
};
app.use(cors(options));

app.use(express.json());

app.use((req, res, next) => {
	console.log(req.method, req.url);
	next();
});

app.use('/auth', authRoutes);
app.use('/tests', testsRoutes);
app.use('/users', userRoutes);

export default app;
