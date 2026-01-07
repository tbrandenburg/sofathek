import appDebug from './app-debug';

const PORT = parseInt(process.env.PORT || '3004', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = appDebug.listen(PORT, HOST, () => {
  console.log(`Debug server running on http://${HOST}:${PORT}`);
});

export default server;
