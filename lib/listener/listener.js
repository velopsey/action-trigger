import { listenChannelForMessage } from "./listen-channel-for-message.js";
import { parseMessage } from "../message-filtering/parse-message.js";
import { withPrefix } from "../logger/create-child-logger.js";
import { query } from "../db/query.js";
import { sendMessage } from "../send-post/send-message.js";

async function send(client, actions, logger) {
	logger.info(`Sending Message...`);

	await Promise.all(
		actions.map(
			async (handler) =>
				await sendMessage(
					client,
					handler.channel,
					handler.is_template ? handler.message : handler.message
				)
		)
	);

	logger.info(`Message Sended`);
}

export async function updateListener(client, db, logger) {
	const listenerLogger = withPrefix(logger, "Listener");

	const handlers = await query(
		db,
		`
		SELECT
			s.telegram_id,
			r.id as rule_id,
			r.name,
			r.conditions,
			a.channel,
			a.message,
			a.is_template
		FROM source s
		JOIN rule r ON r.source_id = s.id AND r.active = true
		JOIN action a ON a.rule_id = r.id
		ORDER BY s.telegram_id, r.id, a.id
	`
	);

	const handler = async (event) => {
		const text = event.message.message;
		const parsedMessage = parseMessage(text, handlers);

		if (parsedMessage.length === 0) {
			listenerLogger.info("[Skipped] No rule matches found.");
			return;
		} else {
			await send(client, parsedMessage, logger);
		}
	};

	const channels = [...new Set(handlers.map((handler) => handler.telegram_id))];
	listenChannelForMessage(client, channels, handler, logger);
}
