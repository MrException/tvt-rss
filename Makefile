REPORTER = dot
PATH := ./node_modules/.bin/:${PATH}

test:
	@mocha \
		--reporter $(REPORTER) \
		test/*.js

.PHONY: test
