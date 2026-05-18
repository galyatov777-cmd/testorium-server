import env from 'dotenv';
env.config();
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
	user: process.env.DATABASE_USER_NAME,
	host: process.env.DATABASE_HOST,
	database: process.env.DATABASE_NAME,
	password: process.env.DATABASE_PASSWORD,
	port: process.env.DATABASE_PORT,
});

export default pool;
