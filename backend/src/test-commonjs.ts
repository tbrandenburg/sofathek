const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req: any, res: any) => {
  res.json({ message: 'CommonJS test working' });
});

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CommonJS server running on http://0.0.0.0:${PORT}`);
});
