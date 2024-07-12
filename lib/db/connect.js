import { Pool } from "pg";
import { withPrefix } from "../logger/create-child-logger.js";

export async function connect(connectionString, logger) {
	const dbLogger = withPrefix(logger, "DB");

	const pool = new Pool({ connectionString });

	pool.on("connect", () => dbLogger.info("DB is connecting"));
	pool.on("error", (e) => dbLogger.error(e));

	try {
		await pool.query("SELECT 1");
		dbLogger.info("DB is ready");
	} catch (e) {
		dbLogger.error(e);
		throw e;
	}

	process.on("SIGINT", async () => {
		dbLogger.info("DB disconnected");
		await pool.end();
	});

	return pool;
}
