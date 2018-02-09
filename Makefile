all:	tweegee webapp

clean:	tweegee-clean webapp-clean

start:	start-debug


tweegee:
	cd Tweegee && swift build

tweegee-clean:
	cd Tweegee && swift package clean


webapp:
	cd webapp && npm install

webapp-clean:
	rm -rf webapp/node_modules


start-debug:
	cd webapp && NODE_ENV=debug DEBUG=app:* npm start

start-production:
	cd webapp && NODE_ENV=production npm start


pull:
	git pull && git submodule update --init --recursive


.PHONY: tweegee webapp
