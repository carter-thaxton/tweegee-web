# cd to location of this file
cd "$(dirname "$(test -L "${BASH_SOURCE[0]}" && readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")")"

# Make sure node is loaded
[[ -s "$HOME/.nvm/nvm.sh" ]] && . "$HOME/.rvm/nvm.sh"

# start server with forever
NODE_ENV=production DEBUG=app:* forever -a -o log/out.log -e log/err.log start server.js
