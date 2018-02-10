#!/bin/bash

# cd to location of this file
cd "$(dirname "$(test -L "${BASH_SOURCE[0]}" && readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")")"

# Make sure node is loaded
[[ -s "$HOME/.nvm/nvm.sh" ]] && \. "$HOME/.nvm/nvm.sh"

# Make sure ruby is loaded with rvm
[[ -s /etc/profile.d/rvm.sh ]] && \. /etc/profile.d/rvm.sh

# start server with forever
NODE_ENV=production DEBUG=app:* forever -a -o log/out.log -e log/err.log start server.js
