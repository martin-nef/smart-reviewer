.PHONY: all lint typecheck test watch_test dsl setup run console spoom_bump

all: lint typecheck test

lint:
	bin/rubocop -A

typecheck:
	bin/srb tc

test:
	bin/rspec

watch_test:
	fswatch -o app spec lib | xargs -n1 -I{} bin/rspec

dsl:
	bin/tapioca dsl

setup:
	bundle install
	bin/rspec

run:
	bin/rails server          # http://localhost:3000

console:
	bin/rails console

spoom_bump:
	bin/spoom bump --from false --to true
	bin/srb tc
