export async function query(db, sql, params = []) {
	if (!db) throw new Error("DB not connected");

	const result = await db.query(sql, params);
	return result.rows;
}
