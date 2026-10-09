// cPanel/Passenger entry point; application source remains under server/.
const path = require('path');
const { createRequire } = require('module');
const serverRequire = createRequire(require.resolve('./server/index'));
const dotenv = serverRequire('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'server', '.env') });
require('./server/index').start()
    .then(() => console.info('Server ready'))
    .catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
