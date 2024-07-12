function checkCondition(text, condition) {
	switch (condition.type) {
		case "contains":
			return { value: text.includes(condition.value), data: null };
		case "not_contains":
			return { value: !text.includes(condition.value), data: null };
		default:
			return { value: false, data: null };
	}
}

function flatData(results) {
	const data = results.reduce((acc, item) => {
		return item.data ? { ...acc, ...item.data } : acc;
	}, {});
	return Object.keys(data).length > 0 ? data : null;
}

function checkRule(text, rule) {
	const { match, items } = rule.conditions;

	const results = items.map((condition) => checkCondition(text, condition));

	return {
		value:
			match === "all"
				? results.every((r) => r.value)
				: results.some((r) => r.value),
		data: flatData(results),
	};
}

export function parseMessage(text, rules) {
	return rules.reduce((acc, rule) => {
		const { value, data } = checkRule(text, rule);

		if (value) {
			acc.push({ ...rule, data });
		}
		return acc;
	}, []);
}
