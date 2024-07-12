import { NewMessage } from "telegram/events/index.js";
import { markChannelAsRead } from "./mark-channel-as-read.js";
import { getRealDelay } from "./log-real-delay.js";

export async function listenChannelForMessage(client, channels, fn, logger) {
	client.addEventHandler(async (update) => {
		logger.info(
			"Message received: %s",
			update.message.message.replaceAll("\n", "\\n")
		);
		await fn(update);
		logger.info("Real delay: %d", getRealDelay(update) / 1000);
		await markChannelAsRead(client, channels);
	}, new NewMessage({ incoming: true, chats: channels }));

	logger.info(`Listening for new messages in the ${channels.join(", ")}`);
}
