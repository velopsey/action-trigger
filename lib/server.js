import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/StringSession.js";
import { withPrefix } from "./logger/create-child-logger.js";
import { env } from "./env.js";

export async function createClient(logger) {
	const authLogger = withPrefix(logger, "Auth");

	const apiId = env.app.id;
	const apiHash = env.app.hash;
	const session = new StringSession(env.app.session);

	const client = new TelegramClient(session, apiId, apiHash, {
		connectionRetries: 5,
	});

	authLogger.info("Starting Telegram client...");

	await client.start({
		onError: (err) => authLogger.error(err),
	});

	authLogger.info("Started Telegram client successfully.");

	authLogger.info("Starting connect...");

	await client.connect();
	const username = (await client.getMe()).username;

	authLogger.info(`You are now connected as @${username}.`);

	return client;
}
