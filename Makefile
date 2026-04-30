.PHONY: dev be fe mongo mongo-stop deps

# Start mongo (docker), then run BE + FE locally with hot reload.
# Ctrl-C stops both processes.
dev: mongo
	@trap 'kill 0' INT TERM EXIT; \
			$(MAKE) --no-print-directory be & \
			$(MAKE) --no-print-directory fe & \
			wait

be:
	cd be && MONGO_URI=mongodb://localhost:27017/smart_reviewer_development \
			bundle exec rails server -b 0.0.0.0 -p 3000

fe:
	cd fe && npm run dev

mongo:
	@docker ps --format '{{.Names}}' | grep -q '^smart-reviewer-mongo$$' || \
			docker run -d --rm --name smart-reviewer-mongo \
					-p 27017:27017 \
					-v $(PWD)/tmp/mongo:/data/db \
					mongo:7 >/dev/null
	@echo "mongo: running on localhost:27017"

mongo-stop:
	-docker stop smart-reviewer-mongo

deps:
	cd be && bundle install
	cd fe && npm install