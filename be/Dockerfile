FROM node:alpine                                                                                                                                     
RUN echo 'require("http").createServer((req,res)=>{res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({status:"ok"}))}).listen(3000)' > server.js
EXPOSE 3000                                                                                                                                          
CMD ["node", "server.js"]