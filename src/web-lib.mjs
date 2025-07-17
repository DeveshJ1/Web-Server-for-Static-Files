import * as path from "path";
import * as net from "net";
import * as fs from "fs";
import MarkdownIt from "markdown-it";

const MIME_TYPES = {
    "jpg" : "image/jpg",
    "jpeg" : "image/jpeg",
    "png" : "image/png",
    "html" : "text/html",
    "css" : "text/css",
    "txt" : "text/plain"
};

/**
 * returns the extension of a file name (for example, foo.md returns md)
 * @param fileName (String)
 * @return extension (String)
 */
function getExtension(fileName) {
    const formatPath = path.extname(fileName).toLowerCase();
    if (formatPath.startsWith(".")) {
        return formatPath.substring(1);
    }
    return formatPath;
}

/**
 * determines the type of file from a file's extension (for example,
 * foo.html returns text/html
 * @param: fileName (String)
 * @return: MIME type (String), undefined for unkwown MIME types
 */
function getMIMEType(fileName) {
    const ext = path.extname(fileName);
    return ext.length > 0 ? MIME_TYPES[ext.substring(1)] : null;
}

class Request {
    constructor(reqStr) {
        const [method, path] = reqStr.split(" ");
        this.method = method;
        this.path = path;
    }
}

class Response {

    static STATUS_CODES = {
        200 : "OK",
        308 : "Permanent Redirect",
        404 : "Page Not Found",
        500 : "Internal Server Error"
    };

    constructor(socket, statusCode = 200, version = "HTTP/1.1") {
        this.sock = socket;
        this.statusCode = statusCode;
        this.version = version;
        this.headers = {};
        this.body = null;
    }

    setHeader(name, value) {
        this.headers[name] = value;
    }

    status(statusCode) {
        this.statusCode = statusCode;
        return this;
    }

    send(body) {
        this.body = body ?? "";
      
        if (!Object.hasOwn(this.headers, "Content-Type")) {
            this.headers["Content-Type"] = "text/html";
        }

        const statusCodeDesc = Response.STATUS_CODES[this.statusCode];

        const headersString = Object.entries(this.headers).reduce((s, [name, value]) => {
            return s + `${name}: ${value} \r\n`;
        }, "");

        this.sock.write(`${this.version} ${this.statusCode} ${statusCodeDesc}\r\n`);
        this.sock.write(`${headersString}\r\n`);
        this.sock.write(this.body);

        this.sock.end();
    }

    }

class HTTPServer {
    constructor(rootDirFull, redirectMap) {
        this.rootDirFull = rootDirFull;
        this.redirectMap = redirectMap;
        this.server = net.createServer(this.handleConnection.bind(this));
    }
    get(path, cb) {
        const path1=path.trim(); 
        const cb1=cb.trim();
        this.redirectMap[path1] = cb1;
      }
    listen(port, host) {
        this.server.listen(port, host);
    }

    handleConnection(sock) {
        sock.on("data", data => this.handleRequest(sock, data));
    }
    isFile(reqpath,res)
    {
        const reqpathtrim=reqpath.replace("/", "").trim();
        if(reqpathtrim.includes(".."))
        {
            res.status(500);
            res.send("File is not allowed to read path above the root");
        }
        const reqPathFull = path.join(this.rootDirFull, reqpathtrim);
        fs.access(reqPathFull, fs.constants.F_OK, (err) => {
            if(err) {
                res.status(404);
                res.send("Path or File not Found");
            } else {
                fs.stat(reqPathFull, (err,stats)=>{
                    if(err)
                    {
                        res.status(500);
                        res.send(500);
                    }
                    if(stats.isFile())
                    {
                        const type = getMIMEType(reqPathFull);
                        fs.readFile(reqPathFull, function(err, data) {
                            if(err) 
                            {
                                res.status(500);
                                res.send("File can't be read");
                            }
                            else
                            {
                                res.status(200);
                                res.setHeader("Content-Type", type);
                                if(getExtension(reqPathFull)==='md')
                                {
                                    const markdown = MarkdownIt({html: true});
                                    const rendered = markdown.render(data.toString());
                                    res.send(rendered);

                                }  
                                else
                                { 
                                 //req.path = reqPathFull;
                                res.setHeader("Content-Type", type);
                                res.send(data);
                                }
                            }
                        });
                     }
                     else if(stats.isDirectory()) 
                     {
                        fs.readdir(reqPathFull,{withFileTypes: true},(err,files)=>{
                            if(err)
                            {
                                res.status(500);
                                res.send(500);
                            }else
                            {
                                res.status(200);
                             //   const typee = getMIMEType(files[0]);
                                let entire="";
                                files.forEach(function(file){
                                    if (file.isDirectory())
                                    {
                                        entire= entire + `<a href = ${file.name}/ > ${file.name}/</a>\n`;
                                    }
                                    else
                                    {
                                        entire= entire + `<a href = ${file.name} > ${file.name}</a>\n`;
                                    }
                                });
                                res.send(entire);
                            }
                        }); 
                     }
                });
            }
        });

    }

    handleRequest(sock, binaryData) {
        const req = new Request(binaryData.toString());
        const res = new Response(sock);
      

        // TODO: (see homework specification for details)
        // 0. implementation can start here, but other classes / methods can be modified or added
        // 1. handle redirects first
        // 2. if not a redirect and file/dir does not exist send back not found
        // 3. if file, serve file
        // 4. if dir, generate page that lists files and dirs contained in dir
        // 5. if markdown, compile and send back html
        if (Object.hasOwn(this.redirectMap, req.path)){
        res.status(308);
        req.path = this.redirectMap[req.path];
        res.setHeader("Location", req.path);
        res.send("Moved Permanently");
     }else if(this.isFile(req.path,res)) 
     {
        return;
     }
    }
     
}
    
    





export {
    Request,
    Response,
    HTTPServer
};