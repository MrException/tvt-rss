REPORTER = dot

test:
	@mocha \
		--reporter $(REPORTER) \
		tests/*.js
