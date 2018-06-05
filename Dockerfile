FROM node:latest

WORKDIR /root/

ADD . /root/sentinel

ADD run.sh /root/

RUN  apt-get update && apt-get install mongodb redis-server -yy gcc make node-gyp

EXPOSE 3000

CMD [ "sh", "run.sh" ]
 