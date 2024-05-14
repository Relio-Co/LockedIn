# Use the official Node.js 12 image.
# https://hub.docker.com/_/node
FROM node:22

# Create and change to the app directory.

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app

# Copy package.json and package-lock.json to work directory
COPY package*.json ./

# Install Expo CLI globally

# Install dependencies
RUN npm install

# Copy local code to the container image.
COPY . .


ENV EXPO_PACKAGER_PROXY_URL=https://expo.saipriya.org
# Expo CLI port
EXPOSE 8081

CMD ["npm", "start"]
