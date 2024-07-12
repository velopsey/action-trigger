import { Api } from "telegram";

export async function markChannelAsRead(client, channels) {
	for await (const channel of channels) {
		await client.invoke(
			new Api.channels.ReadHistory({
				channel: channel,
				maxId: 0,
			})
		);
	}
}
