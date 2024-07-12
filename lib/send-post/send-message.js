export async function sendMessage(client, channelName, message) {
	await client.sendMessage(channelName, {
		message,
		parseMode: "markdownv2",
	});
}
