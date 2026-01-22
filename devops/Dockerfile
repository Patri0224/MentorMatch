#  Immagine base Node.js leggera
FROM node:20-alpine

#  Cartella di lavoro dentro il container
WORKDIR /app

#  Copia i file delle dipendenze
COPY package*.json ./

#  Installa le dipendenze
RUN npm install

#  Copia tutto il resto del progetto
COPY . .

#  Espone la porta su cui Express gira
EXPOSE 3000

#  Comando per avviare l'app
CMD ["node", "server.js"]
