FROM node:8.15-alpine

# Create app directory
WORKDIR /usr/src/app/


# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json truffle.js yarn.lock ./
COPY contracts contracts

# Compile necessary contracts for app and cleanup unnecessary files
RUN apk add --update --no-cache --virtual build-dependencies bash git python make g++ ca-certificates && \
    yarn install --pure-lockfile --production=true && \
    yarn cache clean && \
    apk del build-dependencies && \
    apk add --no-cache tini git tzdata

COPY . .
COPY src/tasks/bots-cron-tasks.cfg /etc/crontabs/root
RUN chmod +x src/run-bots.sh

# If you are building your code for production
# RUN npm install --only=production

# Expose container port
EXPOSE 8080

# Run Node app as child of tini
# Signal handling for PID1 https://github.com/krallin/tini
ENTRYPOINT ["/sbin/tini", "--"]

CMD [ "npm", "run", "--silent", "start" ]
