const https = require('https');
https.request({
  hostname: 'easypanel.lucaseditor.com.br',
  path: '/api/deployAppService',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 453ae5c8cd2c3dd19faada056d5c058ce48da2bc650f363a0d651775d1c714ef',
    'Content-Type': 'application/json'
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d));
}).end(JSON.stringify({projectName: 'painel-de-escala', serviceName: 'dash-dev', forceRebuild: true}));
