FROM node:lts as development

WORKDIR /app

COPY package*.json ./
RUN npm install



COPY . .
RUN npm run build:consumers
