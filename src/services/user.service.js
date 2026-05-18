import pool from '../config/db.js';

export const updateMe = async (userId, data) => {
	console.log(userId);
	console.log(data);
	if (!data) {
		throw new Error('No data provided');
	}

	const { name, about, email, university, role } = data;

	const result = await pool.query(
		`
        UPDATE users SET
            full_name = $1,
            about = $2,
            email = $3,
            university = $4,
            role = $5
        WHERE id = $6
        RETURNING 
            id,
            full_name,
            email,
            about,
            university,
            role
        `,
		[name, about, email, university, role, userId],
	);

	return result.rows[0];
};
