REPORTER = dot
PATH := ./node_modules/.bin/:${PATH}

test:
	@mocha \
		--reporter $(REPORTER) \
		tests/*.js

.PHONY: test
