export function withPrefix(logger, prefix) {
	return logger.child({}, { msgPrefix: `[${prefix}] ` });
}
