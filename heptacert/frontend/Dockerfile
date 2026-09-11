FROM node:20-alpine
ARG NEXT_PUBLIC_API_BASE=http://localhost:8765/api
ARG NEXT_SERVER_API_BASE=http://backend:8000/api
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_SERVER_API_BASE=$NEXT_SERVER_API_BASE
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start"]
