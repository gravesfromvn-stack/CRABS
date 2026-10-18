// Separate local port and project-local D1; no production configuration is used.
import './sites-env.mjs';
import {fileURLToPath} from 'node:url';
const cli=new URL('../node_modules/vinext/dist/cli.js',import.meta.url);
process.argv=[process.execPath,fileURLToPath(cli),'dev','--port','5188'];
await import(cli.href);
