import envSchema from "env-schema";
import S from "fluent-json-schema";

const schema = envSchema({
	data: process.env,
	schema: S.object()
		.prop("MODE", S.string().required())
		.prop("APP_ID", S.number().required())
		.prop("API_HASH", S.string().required())
		.prop("DATABASE_URL", S.string().required())
		.prop("SESSION", S.string().required()),
});

export const env = {
	app: {
		id: schema.APP_ID,
		hash: schema.API_HASH,
		session: schema.SESSION,
	},
	pg: {
		url: schema.DATABASE_URL,
	},
	mode: schema.MODE,
	prod: schema.MODE === "production",
	dev: schema.MODE === "development",
};
