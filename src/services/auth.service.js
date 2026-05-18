import pool from '../config/db.js';
import bcrypt from 'bcrypt';

import generateToken from '../utils/generateToken.js';

export const register = async ({ full_name, email, password }) => {
	if (!email || !password) {
		throw new Error('Missing fields');
	}

	const existing = await pool.query('SELECT * FROM users WHERE email = $1', [
		email,
	]);

	if (existing.rows.length > 0) {
		throw new Error('User exists');
	}

	const hashed = await bcrypt.hash(password, 10);

	const result = await pool.query(
		`
        INSERT INTO users (full_name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, full_name, email
    `,
		[full_name, email, hashed],
	);

	const user = result.rows[0];

	const token = generateToken(user);

	return {
		user,
		token,
	};
};

export const login = async ({ email, password }) => {
	const result = await pool.query('SELECT * FROM users WHERE email = $1', [
		email,
	]);

	const user = result.rows[0];

	if (!user) {
		throw new Error('Invalid credentials');
	}

	const isMatch = await bcrypt.compare(password, user.password);

	if (!isMatch) {
		throw new Error('Invalid credentials');
	}

	const token = generateToken(user);

	return {
		token,
		user: {
			id: user.id,
			full_name: user.full_name,
			email: user.email,
		},
	};
};

export const me = async userId => {
	const result = await pool.query(
		`
        SELECT 
            id,
            full_name,
            email,
            about,
            phone,
            location,
            birth_date,
            university,
            role,
            created_at,
            last_login
        FROM users
        WHERE id = $1
    `,
		[userId],
	);

	const user = result.rows[0];
	console.log(user);
	if (!user) {
		throw new Error('User not found');
	}

	return user;
};
