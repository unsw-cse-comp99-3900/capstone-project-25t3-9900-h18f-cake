FROM node:20
WORKDIR /app

ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

COPY frontend/package.json frontend/package-lock.json* frontend/yarn.lock* ./
RUN npm ci || npm install

COPY frontend ./

EXPOSE 3000

CMD ["npm", "start"]
