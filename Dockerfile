FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /workspace

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "check"]
