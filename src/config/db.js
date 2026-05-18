import env from 'dotenv';
env.config();

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

export default pool;
