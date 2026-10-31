FROM node:20-slim

# O Prisma precisa do openssl para se conectar ao banco
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app

COPY package.json yarn.loc[k] ./
RUN yarn install

COPY . .
RUN yarn generate

RUN chown -R node:node /home/node/app
USER node

EXPOSE 3001

CMD [ "yarn", "dev" ]
