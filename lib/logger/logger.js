import pino from "pino";

export function createLogger() {
	const logger = pino({
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l",
				ignore: "hostname,pid",
			},
		},
	});

	return logger;
}
