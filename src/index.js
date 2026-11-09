/*
const { createServer } = require('node:http');
const hostname = '127.0.0.1';
const port = 3000;
const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
*/

const express = require("express");
const cp = require("child_process");

const app = express();



app.get("/execute", (req, res) => {
    // This is a comment

  cp.exec(req.query.command, (error, stdout) => {
    res.send(stdout);
  });

    // This is a comment at the end of the function

});