# Railway / Docker用の設定
# nginxを使って静的ファイルを配信

FROM nginx:alpine

# 静的ファイルをnginxの公開ディレクトリにコピー
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY main.js /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# nginx設定ファイルをコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ポート80で公開
EXPOSE 80

# nginxを起動
CMD ["nginx", "-g", "daemon off;"]
