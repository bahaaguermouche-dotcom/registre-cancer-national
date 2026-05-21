FROM node:20-alpine

WORKDIR /usr/src/app


# Copy package management files to leverage layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose backend API port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
