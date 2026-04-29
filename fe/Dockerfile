FROM nginx:alpine                                                                                                                                  
RUN cat > /usr/share/nginx/html/index.html.template <<'EOF'                         
<!DOCTYPE html>                                                                                                                                      
<html>                                                                                                                                               
<body>                                                                                                                                               
<h1>Hello, World!</h1>                                                                                                                             
<pre id="response">Loading...</pre>
<script>
    fetch("${API_URL}")
    .then(r => r.text())
    .then(t => document.getElementById("response").textContent = t)
    .catch(e => document.getElementById("response").textContent = "Error: " + e);
</script>
</body>
</html>
EOF
CMD ["/bin/sh", "-c", "envsubst '$API_URL' < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html && nginx -g 'daemon off;'"]
EXPOSE 80
