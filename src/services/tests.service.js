import pool from '../config/db.js';

export const createTest = async ({ title, description, author_id }) => {
	const result = await pool.query(
		`
        SELECT create_test($1, $2, $3)
    `,
		[title, description, author_id],
	);

	return {
		test_id: result.rows[0].create_test,
	};
};

export const getAllTests = async () => {
	const result = await pool.query(
		`
        SELECT *
        FROM tests
    `,
	);

	return result.rows;
};

export const getTestById = async id => {
	const result = await pool.query(
		`
        SELECT 
            t.id AS test_id,
            t.title,
            t.description,

            q.id AS question_id,
            q.question_text,
            q.question_type,

            a.id AS answer_id,
            a.answer_text

        FROM tests t

        LEFT JOIN questions q 
            ON q.test_id = t.id

        LEFT JOIN answers a 
            ON a.question_id = q.id

        WHERE t.id = $1
        ORDER BY q.id, a.id
    `,
		[id],
	);

	if (result.rows.length === 0) {
		return null;
	}

	const test = {
		id: result.rows[0].test_id,
		title: result.rows[0].title,
		description: result.rows[0].description,
		questions: [],
	};

	const questionsMap = new Map();

	for (const row of result.rows) {
		if (row.question_id && !questionsMap.has(row.question_id)) {
			const question = {
				id: row.question_id,
				question: row.question_text,
				type: row.question_type,
				answers: [],
			};

			questionsMap.set(row.question_id, question);
			test.questions.push(question);
		}

		if (row.answer_id) {
			questionsMap.get(row.question_id).answers.push({
				id: row.answer_id,
				text: row.answer_text,
			});
		}
	}

	return test;
};

export const startTest = async ({ user_id, test_id }) => {
	const result = await pool.query(
		`
        SELECT start_test($1, $2)
    `,
		[user_id, test_id],
	);

	return {
		result_id: result.rows[0].start_test,
	};
};

export const submitAnswer = async ({
	result_id,
	question_id,
	answer_ids = [],
	answer_text = '',
}) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// normalize ids
		answer_ids = answer_ids.map(Number);

		// question type
		const questionRes = await client.query(
			`
			SELECT question_type
			FROM questions
			WHERE id = $1
		`,
			[question_id],
		);

		const questionType = questionRes.rows[0]?.question_type;

		// очистка попередніх відповідей
		await client.query(
			`
			DELETE FROM user_answers
			WHERE result_id = $1
			AND question_id = $2
		`,
			[result_id, question_id],
		);

		// =========================
		// TEXT QUESTION
		// =========================

		if (questionType === 'text') {
			const correctTextRes = await client.query(
				`
				SELECT id, answer_text
				FROM answers
				WHERE question_id = $1
				AND is_correct = true
				LIMIT 1
			`,
				[question_id],
			);

			const correctAnswer = correctTextRes.rows[0];

			const correctText = correctAnswer?.answer_text?.trim().toLowerCase();

			const userText = answer_text?.trim().toLowerCase();

			const isCorrect = correctText === userText;

			// якщо відповідь правильна —
			// записуємо correct answer id
			if (isCorrect && correctAnswer?.id) {
				answer_ids = [correctAnswer.id];

				await client.query(
					`
					INSERT INTO user_answers (
						result_id,
						question_id,
						answer_id
					)
					VALUES ($1, $2, $3)
				`,
					[result_id, question_id, correctAnswer.id],
				);
			} else {
				answer_ids = [];
			}
		}

		// =========================
		// SINGLE / MULTIPLE / TRUEFALSE
		// =========================

		if (questionType !== 'text') {
			for (const answerId of answer_ids) {
				await client.query(
					`
					INSERT INTO user_answers (
						result_id,
						question_id,
						answer_id
					)
					VALUES ($1, $2, $3)
				`,
					[result_id, question_id, answerId],
				);
			}
		}

		// =========================
		// CORRECT ANSWERS
		// =========================

		const correctRes = await client.query(
			`
			SELECT id
			FROM answers
			WHERE question_id = $1
			AND is_correct = true
		`,
			[question_id],
		);

		const correctIds = correctRes.rows.map(r => Number(r.id));

		// =========================
		// CHECK CORRECTNESS
		// =========================

		const sortedUser = [...answer_ids].sort((a, b) => a - b);

		const sortedCorrect = [...correctIds].sort((a, b) => a - b);

		const isCorrect =
			sortedUser.length === sortedCorrect.length &&
			sortedUser.every((val, i) => val === sortedCorrect[i]);

		// =========================
		// SCORE
		// =========================

		const scoreRes = await client.query(
			`
			SELECT 
				COUNT(DISTINCT q.id) FILTER (
					WHERE NOT EXISTS (
						SELECT 1
						FROM answers a
						WHERE a.question_id = q.id
						AND a.is_correct = true
						AND a.id NOT IN (
							SELECT ua.answer_id
							FROM user_answers ua
							WHERE ua.result_id = $1
							AND ua.question_id = q.id
						)
					)
					AND NOT EXISTS (
						SELECT 1
						FROM user_answers ua
						JOIN answers a 
							ON a.id = ua.answer_id
						WHERE ua.result_id = $1
						AND ua.question_id = q.id
						AND a.is_correct = false
					)
				) AS correct,

				COUNT(DISTINCT q.id) AS total

			FROM questions q

			WHERE q.test_id = (
				SELECT test_id
				FROM test_results
				WHERE id = $1
			)
		`,
			[result_id],
		);

		const correct = Number(scoreRes.rows[0].correct);

		const total = Number(scoreRes.rows[0].total);

		const score = total === 0 ? 0 : Math.round((correct / total) * 100);

		// =========================
		// UPDATE RESULT
		// =========================

		await client.query(
			`
			UPDATE test_results
			SET score = $1
			WHERE id = $2
		`,
			[score, result_id],
		);

		await client.query('COMMIT');

		return {
			is_correct: isCorrect,
			score,
			correct,
			total,
		};
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const createFullTest = async data => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// 1. тест
		const testRes = await client.query(
			`
			INSERT INTO tests (title, description, author_id)
			VALUES ($1, $2, $3)
			RETURNING *
		`,
			[data.title, data.description, data.author_id],
		);

		const test = testRes.rows[0];

		// 2. вопросы
		for (const q of data.questions) {
			const questionRes = await client.query(
				`
				INSERT INTO questions (test_id, question_text, question_type)
				VALUES ($1, $2, $3)
				RETURNING *
			`,
				[test.id, q.question, q.type],
			);

			const question = questionRes.rows[0];

			// 3. ответы
			if (q.type === 'single') {
				for (let i = 0; i < q.answers.length; i++) {
					await client.query(
						`
						INSERT INTO answers (question_id, answer_text, is_correct)
						VALUES ($1, $2, $3)
					`,
						[question.id, q.answers[i].text, i === q.correctIndex],
					);
				}
			}

			if (q.type === 'multiple') {
				for (let i = 0; i < q.answers.length; i++) {
					await client.query(
						`
						INSERT INTO answers (question_id, answer_text, is_correct)
						VALUES ($1, $2, $3)
					`,
						[question.id, q.answers[i].text, q.correctIndexes[i] || false],
					);
				}
			}

			if (q.type === 'text') {
				await client.query(
					`
					INSERT INTO answers (question_id, answer_text, is_correct)
					VALUES ($1, $2, true)
				`,
					[question.id, q.correctText || ''],
				);
			}

			if (q.type === 'truefalse') {
				await client.query(
					`
					INSERT INTO answers (question_id, answer_text, is_correct)
					VALUES 
					($1, 'true', $2),
					($1, 'false', $3)
				`,
					[question.id, q.correctBool === true, q.correctBool === false],
				);
			}
		}

		await client.query('COMMIT');

		return { test_id: test.id };
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
};

export const getTestsByUser = async user_id => {
	const result = await pool.query(
		`
		SELECT 
			t.id,
			t.title,

			-- кількість питань
			COUNT(DISTINCT q.id) AS question_count,

			-- кількість проходжень
			COUNT(DISTINCT tr.id) AS completed,

			-- середній score
			COALESCE(ROUND(AVG(tr.score)), 0) AS average_score,

			-- останній score
			COALESCE(
				(
					SELECT tr2.score
					FROM test_results tr2
					WHERE tr2.test_id = t.id
					AND tr2.user_id = $1
					ORDER BY tr2.id DESC
					LIMIT 1
				),
				0
			) AS last_score

		FROM tests t

		LEFT JOIN questions q 
			ON q.test_id = t.id

		LEFT JOIN test_results tr 
			ON tr.test_id = t.id

		WHERE t.author_id = $1

		GROUP BY t.id
		ORDER BY t.id DESC
		`,
		[user_id],
	);

	return result.rows.map(t => ({
		title: t.title,
		count: Number(t.question_count),
		completed: Number(t.completed),
		score: t.last_score,
		average: t.average_score,
	}));
};
