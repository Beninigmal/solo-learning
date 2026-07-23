const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3333,
  path: '/quests/institution/timetable/batch-generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(JSON.stringify({ shift: 'MATUTINO' }));
req.end();
