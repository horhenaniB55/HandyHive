FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add environment script to dynamically inject env vars
WORKDIR /usr/share/nginx/html

# Create a script to generate env config at runtime
RUN echo '#!/bin/sh' > env.sh && \
    echo 'echo "window.env = {" > env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_API_KEY: \"$VITE_FIREBASE_API_KEY\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_AUTH_DOMAIN: \"$VITE_FIREBASE_AUTH_DOMAIN\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_PROJECT_ID: \"$VITE_FIREBASE_PROJECT_ID\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_STORAGE_BUCKET: \"$VITE_FIREBASE_STORAGE_BUCKET\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_MESSAGING_SENDER_ID: \"$VITE_FIREBASE_MESSAGING_SENDER_ID\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_APP_ID: \"$VITE_FIREBASE_APP_ID\"," >> env-config.js' >> env.sh && \
    echo 'echo "  VITE_FIREBASE_MEASUREMENT_ID: \"$VITE_FIREBASE_MEASUREMENT_ID\"" >> env-config.js' >> env.sh && \
    echo 'echo "}" >> env-config.js' >> env.sh && \
    chmod +x env.sh

# Create a wrapper script to run env.sh and then start nginx
RUN echo '#!/bin/sh' > start.sh && \
    echo './env.sh' >> start.sh && \
    echo 'nginx -g "daemon off;"' >> start.sh && \
    chmod +x start.sh

# Add env-config.js to index.html
RUN sed -i 's/<head>/<head><script src="\/env-config.js"><\/script>/' /usr/share/nginx/html/index.html

# Expose port 8080
EXPOSE 8080

# Start nginx with env vars
CMD ["/usr/share/nginx/html/start.sh"] 