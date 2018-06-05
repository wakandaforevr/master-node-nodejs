#!/bin/sh

nohup mongod >> /dev/null &
cd /root/sentinel/src
npm install && npm run build
nohup npm run dev >> /dev/null &
nohup node app.js >> /dev/null &

