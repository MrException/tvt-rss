PATH := ./node_modules/.bin/:${PATH}

test:
	@mocha \
		test/*.js

.PHONY: test
