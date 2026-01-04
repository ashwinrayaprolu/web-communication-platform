FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy HTML files
COPY html /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
