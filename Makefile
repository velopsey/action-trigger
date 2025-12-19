.PHONY: watch run repl build

.EXPORT_ALL_VARIABLES:
include .env

watch:
	clj -M:sc watch app

run:
	node out/app.js

dev:
	clj -M:sc watch app --config-merge '{:devtools {:autorun true}}'

build:
	clj -M:sc release app
