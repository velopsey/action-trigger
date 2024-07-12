export function getRealDelay(update) {
	const now = new Date().valueOf();
	const messageTime = update.message.date * 1000;

	return now - messageTime;
}
