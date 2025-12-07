import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readline from "node:readline";

import { createLogger } from "../lib/logger/logger.js";
import { env } from "../lib/env.js";

const logger = createLogger();

const apiId = env.app.id;
const apiHash = env.app.hash;
const stringSession = new StringSession("");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

(async () => {
	logger.info("Loading script for sessions...");

	const client = new TelegramClient(stringSession, apiId, apiHash, {
		connectionRetries: 5,
	});

	await client.start({
		phoneNumber: async () =>
			new Promise((resolve) =>
				rl.question("Please enter your number: ", resolve)
			),
		password: async () =>
			new Promise((resolve) =>
				rl.question("Please enter your password: ", resolve)
			),
		phoneCode: async () =>
			new Promise((resolve) =>
				rl.question("Please enter the code you received: ", resolve)
			),
		onError: (err) => logger.info(err),
	});

	logger.info("session", "client.session.save()");

	process.exit(0);
})();
