all:	tweegee webapp

clean:	tweegee-clean webapp-clean


tweegee:
	cd Tweegee && swift build

tweegee-clean:
	cd Tweegee && swift package clean


webapp:
	cd webapp && npm install

webapp-clean:  clean-uploads
	rm -rf webapp/node_modules


clean-uploads:
	rm -f webapp/uploads/*


update-tweegee:		tweegee
	git status | grep -E 'modified:\s+Tweegee \(new commits\)' > /dev/null
	cd Tweegee && git push
	git add Tweegee
	git commit -m "Update Tweegee"
	git push


pull:
	git pull && git submodule update --init --recursive


start:
	cd webapp && npm start

start-watch:
	cd webapp && FOREVER_ARGS=-w npm start

stop:
	cd webapp && npm stop

restart:
	cd webapp && npm restart


open:
	open http://ec2-18-217-244-234.us-east-2.compute.amazonaws.com


deploy:		deploy-dev deploy-web

deploy-dev:
	ssh tweegee-dev '. ~/.nvm/nvm.sh && cd tweegee-web && make pull all restart'

deploy-web:
	ssh tweegee '. ~/.nvm/nvm.sh && cd tweegee-web && make pull all restart'


.PHONY: tweegee webapp
