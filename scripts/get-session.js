import { startAndGetClient } from "./lib/client.js";

(async () => {
	const client = await startAndGetClient();

	console.log(client.session.save());
})();
