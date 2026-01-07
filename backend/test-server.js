const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Test server working' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

const PORT = 3003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:${PORT}`);
});
