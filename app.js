import { createClient } from "./lib/server.js";
import { env } from "./lib/env.js";
import { connect } from "./lib/db/connect.js";
import { updateListener } from "./lib/listener/listener.js";
import { createLogger } from "./lib/logger/logger.js";
import { keepAlive } from "./lib/keepAlive.js";

const logger = createLogger();

const main = async () => {
	const db = await connect(env.pg.url, logger);
	const client = await createClient(logger);

	updateListener(client, db, logger);

	keepAlive(client, logger);
};

main().catch((err) => logger.error(err));
