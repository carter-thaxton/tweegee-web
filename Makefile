all:	tweegee

clean:	tweegee-clean

tweegee:
	cd Tweegee && swift build

tweegee-clean:
	cd Tweegee && swift package clean

pull:
	git pull && git submodule update --init --recursive
