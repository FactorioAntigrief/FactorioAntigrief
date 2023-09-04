FROM node:18

# Create app directory
WORKDIR /app

# Copy the app code
COPY . .

RUN yarn install

# Build the project
RUN yarn build

WORKDIR /app/apps/clientside-bot
RUN yarn db:sync

#RUN yarn bot:addcommands
# Run the application
CMD [ "node", "dist/index" ]
