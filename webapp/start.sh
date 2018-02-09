NODE_ENV=production DEBUG=app:* forever -a -o log/out.log -e log/err.log start server.js
