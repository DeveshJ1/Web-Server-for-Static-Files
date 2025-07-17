import * as webLib from './web-lib.mjs';
import * as path from "path";
import * as fs from "fs";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
const pathh=path.join(__dirname, 'config.json');
fs.readFile(pathh, 'utf-8', function(err, data)
{
    if(!err)
    {
       const parsed=JSON.parse(data);
       const rootdirectory=parsed.root_directory;
       const redirectMap=parsed.redirect_map;
      const server = new webLib.HTTPServer(rootdirectory,redirectMap);
      server.listen(3000, "localhost");
    }else
    {
        console.log(err);
    }
});
// TODO: configure and start server