#!/usr/bin/env sh

# Run cron and Bots
/usr/sbin/crond -f -l 8 & \
npm run bots
