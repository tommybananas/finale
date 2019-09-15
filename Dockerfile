FROM node:10.16.3-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json /usr/src/app/
RUN npm install && npm cache clean --force

#ONBUILD ARG NODE_ENV
#ONBUILD ENV NODE_ENV $NODE_ENV
COPY . /usr/src/app

CMD [ "npm", "test" ]