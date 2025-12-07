function checkCondition(text, condition) {
	switch (condition.type) {
		case "contains":
			return { value: text.includes(condition.value), data: null };

		case "not_contains":
			return { value: !text.includes(condition.value), data: null };

		case "regex": {
			const regexMatch = new RegExp(condition.value).test(text);
			return { value: regexMatch, data: null };
		}

		case "regex_extract": {
			const regex = new RegExp(condition.value);
			const match = text.match(regex);

			if (match) {
				const extractedValue = match[0];
				return {
					value: true,
					data: { [condition.field]: extractedValue },
				};
			}

			return { value: false, data: null };
		}

		case "exact":
			return { value: text === condition.value, data: null };

		default:
			console.warn(`Unknown condition type: ${condition.type}`);
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
