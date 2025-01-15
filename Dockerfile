# Usar una imagen base de Node.js
FROM node:16-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .
#RUN chown -R node:node /app/node_modules
# Cambiar a un usuario no root
#USER node
# Exponer el puerto por defecto de React
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]