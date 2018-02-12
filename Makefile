all:	tweegee webapp

clean:	tweegee-clean webapp-clean


tweegee:
	cd Tweegee && swift build

tweegee-clean:
	cd Tweegee && swift package clean


webapp:
	cd webapp && npm install

webapp-clean:
	rm -rf webapp/node_modules


pull:
	git pull && git submodule update --init --recursive


start:
	cd webapp && npm start

restart:
	cd webapp && forever restart 0

open:
	open http://ec2-18-217-244-234.us-east-2.compute.amazonaws.com


.PHONY: tweegee webapp
