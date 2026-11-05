FROM nginx:1.25-alpine@sha256:516475cc129da42866742567714ddc681e5eed7b9ee0b9e9c015e464b4221a00 AS nginx-dist

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/frontend-template/browser /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
