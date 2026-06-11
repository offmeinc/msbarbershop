const http = require('http');

http.get('http://localhost:3000/api/push-config', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    console.log("Status:", resp.statusCode);
    console.log("Body:", data);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
