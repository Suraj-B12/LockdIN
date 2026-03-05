FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY frontend/index.html /usr/share/nginx/html/
COPY frontend/login.html /usr/share/nginx/html/
COPY frontend/onboarding.html /usr/share/nginx/html/
COPY frontend/dashboard.html /usr/share/nginx/html/
COPY frontend/leaderboard.html /usr/share/nginx/html/
COPY frontend/history.html /usr/share/nginx/html/
COPY frontend/profile.html /usr/share/nginx/html/
COPY frontend/style.css /usr/share/nginx/html/
COPY frontend/script.js /usr/share/nginx/html/

# Copy JS and CSS directories
COPY frontend/js/ /usr/share/nginx/html/js/
COPY frontend/css/ /usr/share/nginx/html/css/

# Copy image directories
COPY frontend/displayed_in_index/ /usr/share/nginx/html/displayed_in_index/

# Copy avatars from project root (15 avatar folders × 10 mood PNGs)
COPY Avatars/ /usr/share/nginx/html/Avatars/

EXPOSE 80
