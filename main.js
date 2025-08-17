const fs = require("fs");
const path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { rejects } = require("assert");
const { url } = require("inspector");
const https = require("https");


// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
 const command = process.argv[2];

 switch (command) {
   case "init":
     createGitDirectory();
     break;
   case "cat-file":
     catFile(process.argv[3] , process.argv[4]); 
     break;
   case "hash-object":
     hashBlobObject(process.argv[3] , process.argv[4]);     
     break;    
   case "ls-tree":
     lsTree(process.argv[3] , process.argv[4])
     break;
   case "write-tree":
     writeTree(process.cwd())
     break;
   case "config" : 
     editConfigFile(process.argv[3] ,  process.argv[4])
     break;   
   case "commit-tree" : 
     commitTree(process.argv[3] , process.argv[4] , process.argv[5] , process.argv[6] ,process.argv[7])
     break;
   case "clone" : 
     clone(process.argv[3] , process.argv[4])
     break;
   default:
     throw new Error(`Unknown command ${command}`);
 }

 function createGitDirectory() {
   fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
   fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
   fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

   fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
   console.log("Initialized git directory");
 }

 
 function catFile(option , obName)
     {
          gitIsExist()

          switch(option)
               {
                    case "-p":
                         catFilePrint(obName)
                    break;

                    default:
                         throw new Error(`unkonwn option : ${option}`)
               }     
     }
  function editConfigFile(option , data)
     {
          gitIsExist()

          switch(option)
               {
                    case "user.name" : 
                         editUserName(data) ; 
                    break ; 

                    case "user.email" : 
                         editUserEmail(data)
                    break ; 
                    
                    default : 
                         throw new Error(`unknown option ${option}`)
               }
     }   

  function editUserName(data)
     {
          const configPath = path.join(process.cwd() , '.git' , 'config')

          if(!fs.existsSync(configPath))
               fs.writeFileSync(configPath , "")

          const fileContent  = fs.readFileSync(configPath , 'utf-8')
          let config = parseGitConfig(fileContent);

          if(!config.user)
               {
                    config.user = {}     
                    config.core = {}
               }
               
          
          

          config.user.name = data 
          
          const updatedContent = serializeConfig(config);
          fs.writeFileSync(configPath, updatedContent, 'utf-8');

          
     }

  function editUserEmail(data)
     {
          const configPath = path.join(process.cwd() , '.git' , 'config')

          if(!fs.existsSync(configPath))
               fs.writeFileSync(configPath , "")

          const fileContent  = fs.readFileSync(configPath , 'utf-8')
          let config = parseGitConfig(fileContent);

          if(!config.user)
               {
                    config.user = {}     
                    config.core = {}
               }
               
          
          

          config.user.email = data 
          
          const updatedContent = serializeConfig(config);
          fs.writeFileSync(configPath, updatedContent, 'utf-8');
   
     }   
  function lsTree(hashName , option)
     {
          gitIsExist()

          
          switch(option)
               {
                    case "--name-only":
                         lsTreeNameOnly(hashName) 
                    break ; 
                    
                    default:
                         lsTreeSimple(hashName)
               }
     }
function writeGitObjects(objects) {
        for (const sha in objects) {
            const dir = sha.slice(0, 2);
            const file = sha.slice(2);
            const objectDir = path.join(".git", "objects", dir);
            fs.mkdirSync(objectDir, { recursive: true });

            const compressed = zlib.deflateSync(objects[sha]);
            fs.writeFileSync(path.join(objectDir, file), compressed);
        }
    }

function  writeHEADFile(sha) {
        fs.writeFileSync(".git/HEAD", "ref: refs/heads/master\n");
        fs.writeFileSync(".git/refs/heads/master", `${sha}\n`);
    }   

function findObjectByHash(sha, objects) 
    {
        return objects[sha] || null;
    }
function     parseGitObject(objectBuffer) {
        // Find the null byte that separates header from content
        const nullIndex = objectBuffer.indexOf(0);
        if (nullIndex === -1) {
            throw new Error("Invalid Git object format");
        }
        
        const header = objectBuffer.slice(0, nullIndex).toString();
        const content = objectBuffer.slice(nullIndex + 1);
        
        const [type, size] = header.split(' ');
        return { type, size: parseInt(size), content };
    }
function  extractTreeSHA(commitContent) {
        const lines = commitContent.content.toString().split('\n');
        for (const line of lines) {
            if (line.startsWith('tree ')) {
                return line.substring(5);
            }
        }
        throw new Error("Tree SHA not found in commit");
    }  
function readInflatedObject(buffer) {
        for (let i = 30; i < buffer.length; i++) {
            try {
                const slice = buffer.slice(0, i);
                const inflated = zlib.inflateSync(slice);
                return { object: inflated, consumed: i };
            } catch (err) {
                // Continue trying if it's just a truncated stream
                if (err.code === "Z_BUF_ERROR" || err.message.includes("unexpected end of file")) {
                    continue;
                } else {
                    throw err;
                }
            }
        }
        throw new Error("Inflate failed");
    }    
function decodePackHeader(buffer, offset) {
        let byte = buffer[offset];
        let type = (byte >> 4) & 0x7;
        let size = byte & 0xf;
        let shift = 4;
        let i = 1;

        while (byte & 0x80) {
            byte = buffer[offset + i];
            size |= (byte & 0x7f) << shift;
            shift += 7;
            i++;
        }

        const typeMap = {
            1: "commit",
            2: "tree",
            3: "blob",
            4: "tag",
            6: "ref-delta",
            7: "ofs-delta"
        };

        return {
            type: typeMap[type] || "unknown",
            size,
            headerSize: i
        };
    }      
async function checkoutWorkingDirectory(headSHA, objects) {
        console.log("Checking out working directory files...");
        
        
        const commitObject = findObjectByHash(headSHA, objects);
        if (!commitObject) {
            throw new Error(`Commit object ${headSHA} not found`);
        }

        // Parse the commit to find the tree SHA
        const commitContent = parseGitObject(commitObject);
        const treeSHA = extractTreeSHA(commitContent);
        
        console.log("Tree SHA:", treeSHA);

        // Find the tree object
        const treeObject = findObjectByHash(treeSHA, objects);
        if (!treeObject) {
            throw new Error(`Tree object ${treeSHA} not found`);
        }

        // Parse and checkout the tree
        const treeContent = parseGitObject(treeObject);
        await checkoutTree(treeContent, objects, "");
    }

 async function clone(repoUrl , directory)
     {
          if(!repoUrl || !directory)
              throw new Error(`Usage: clone <repo-url> <directory>`)

          const parsedUrl = new URL(repoUrl)

          fs.mkdirSync(directory , {recursive : true})

          process.chdir(directory)

          createGitDirectory()

                  let options = {
                                        hostname: parsedUrl.hostname,
                                        path: `${parsedUrl.pathname}/info/refs?service=git-upload-pack`,
                                        method: "GET",
                                        headers: {
                                          "User-Agent": "git/1.0"
                                        }
                                   };

                    const refsData = await httpRequest(options)                    
                    const headSha = extractHeadSha(refsData)

                     if (!/^[a-f0-9]{40}$/.test(headSha)) {
                              throw new Error("Invalid HEAD SHA received: " + headSha);
                         }   
                     
                     const pktLine = (s) => s ? `${(s.length + 4).toString(16).padStart(4, "0")}${s}` : "0000";
                     
                    let body  =  pktLine(`want ${headSha} side-band-64k ofs-delta agent=git/1.0\n`) +
                                   pktLine("") +
                                   pktLine("done\n")
                     

                     options = {
                                     hostname: parsedUrl.hostname,
                                     path: `${parsedUrl.pathname}/git-upload-pack`,
                                     method: "POST",
                                     headers: {
                                             "Content-Type": "application/x-git-upload-pack-request",
                                             "User-Agent": "git/1.0",
                                             "Content-Length": Buffer.byteLength(body)
                                        }
                     }
                     
                     const packResponse =  await httpRequest(options , body , true)

                     fs.writeFileSync("raw-pack-response.bin", packResponse);
                     
                     const chunks = []

                     let offset = 0 

                     while(offset+4  <= packResponse.length)
                         {
                              const lengthHex = packResponse.toString("utf-8" , offset , offset + 4)
                              const length = parseInt(lengthHex, 16);
                                   
                              if (length === 0) break;

                              const band = packResponse[offset + 4];
                              const data = packResponse.slice(offset + 5, offset + length);

                              if (band === 1) chunks.push(data);
                                   offset += length;
                         }    

                     const packData = Buffer.concat(chunks)

                     const objects = unpackPackfile(packData)

                     writeGitObjects(objects);
                     writeHEADFile(headSha);

                     await checkoutWorkingDirectory(headSha, objects);
     } 

function  decodePackHeader(buffer, offset) 
     {
        let byte = buffer[offset];
        let type = (byte >> 4) & 0x7;
        let size = byte & 0xf;
        let shift = 4;
        let i = 1;

        while (byte & 0x80) {
            byte = buffer[offset + i];
            size |= (byte & 0x7f) << shift;
            shift += 7;
            i++;
        }

        const typeMap = {
            1: "commit",
            2: "tree",
            3: "blob",
            4: "tag",
            6: "ref-delta",
            7: "ofs-delta"
        };

        return {
            type: typeMap[type] || "unknown",
            size,
            headerSize: i
        };
    }     

function findZlibAtPosition(buffer, startPos) {
        // Look for zlib header within reasonable range
        for (let i = 0; i < 20 && startPos + i < buffer.length - 1; i++) {
            const pos = startPos + i;
            const byte1 = buffer[pos];
            const byte2 = buffer[pos + 1];
            
            // Check for zlib magic bytes
            if (byte1 === 0x78 && (byte2 === 0x9c || byte2 === 0x01 || byte2 === 0xda || byte2 === 0x5e)) {
                return pos;
            }
        }
        return -1;
    }  
    
function unpackPackfile(buffer) {

        const packStart = buffer.indexOf(Buffer.from("PACK"));
        if (packStart === -1) throw new Error("PACK header not found");

        const pack = buffer.slice(packStart);
        if (pack.length < 12) throw new Error("Corrupted PACK file");

        const objectCount = pack.readUInt32BE(8);
        let offset = 12;
        const objects = {};
        
        console.log(`Processing ${objectCount} objects from pack file`);

        for (let i = 0; i < objectCount; i++) {
            try {
                const startOffset = offset;
                const { type, size, headerSize } = decodePackHeader(pack, offset);

                console.log(`→ Object ${i + 1}/${objectCount}, type: ${type}, size: ${size}, offset: ${offset}`);
                
                offset += headerSize;

                if (type === "ref-delta" || type === "ofs-delta") {
                    console.log(`⚠️ Skipping delta object (type: ${type})`);
                    
                    // For ref-delta, skip the 20-byte base SHA
                    if (type === "ref-delta") {
                        offset += 20;
                    }
                    
                    // For ofs-delta, skip the negative offset varint
                    if (type === "ofs-delta") {
                        while (pack[offset] & 0x80) {
                            offset++;
                        }
                        offset++; // skip the last byte
                    }
                    
                    // Skip the compressed delta data
                    // We'll use a simple approach: try to find the next object header
                    let nextObjectFound = false;
                    
                    // Start searching from current position
                    for (let searchPos = offset; searchPos < pack.length - 10; searchPos++) {
                        try {
                            // Try to decode a potential object header at this position
                            const testHeader = decodePackHeader(pack, searchPos);
                            
                            // Check if this is a valid non-delta object type
                            if (testHeader.type === "commit" || testHeader.type === "tree" || 
                                testHeader.type === "blob" || testHeader.type === "tag") {
                                
                                // Verify there's zlib data after the header
                                const afterHeader = searchPos + testHeader.headerSize;
                                const zlibCheck = findZlibAtPosition(pack, afterHeader);
                                
                                if (zlibCheck !== -1) {
                                    offset = searchPos;
                                    nextObjectFound = true;
                                    console.log(`✔️ Found next object at offset: ${offset}`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continue searching
                        }
                    }
                    
                    if (!nextObjectFound) {
                        console.warn(`⚠️ Could not find next object after ${type}, stopping parsing`);
                        break;
                    }
                    
                    // Continue to next iteration without processing this delta
                    continue;
                }

                // Process regular objects (commit, tree, blob, tag)
                const zlibStart = findZlibAtPosition(pack, offset);
                if (zlibStart === -1) {
                    console.warn(`⚠️ No zlib data found for ${type} object at offset ${offset}`);
                    continue;
                }
                
                offset = zlibStart;
                
                try {
                    const { object, consumed } = readInflatedObject(pack.slice(offset));
                    offset += consumed;

                    const header = `${type} ${object.length}\0`;
                    const fullObject = Buffer.concat([Buffer.from(header), object]);
                    const sha = crypto.createHash("sha1").update(fullObject).digest("hex");

                    objects[sha] = fullObject;
                    console.log(`✔️ Processed ${type} object: ${sha}`);
                } catch (err) {
                    console.warn(`⚠️ Failed to process ${type} object at offset ${offset}: ${err.message}`);
                    continue;
                }
                
            } catch (err) {
                console.warn(`⚠️ Error processing object ${i + 1}: ${err.message}`);
                break;
            }
        }

        console.log(`Successfully processed ${Object.keys(objects).length} objects`);
        return objects;
    }
  
 function extractHeadSha(refsData)
     {
          const lines = refsData.split('\n')

          for(const line of lines)
               {
                    const shaMatch = line.match(/^....([a-f0-9]{40})\s+refs\/heads\/master/);
                    if (shaMatch) {
                          return shaMatch[1]; 
                    }

               }

                throw new Error("HEAD ref not found in refs.");
     }

 function writeTree(currDir , option)
     {
          switch(option)
               {
                    case undefined : 
                         let fullHashName = writeTreeSimple(currDir)
                         console.log(fullHashName)
                    break; 
                         
                    default : 
                         throw Error(`unknown option ${option}`)     
               }
     }    
 function commitTree(shaTree , firstOption , data1 ,secondOption , data2)
     {
          gitIsExist()
          

          if(firstOption == '-p')
          {
               if(secondOption != '-m')
                    throw new Error(`unknown option ${secondOption} , should be -m`)

               var shaParentCommit = data1
               var msg  = data2
               
               
          }
               

          else
          {
               var msg = data1
               if(firstOption != '-m')
                    throw new Error(`unknown option ${firstOption} , should be -m` )
          }     
               

          createCommitObject(shaTree , shaParentCommit , msg , firstOption)

     }    

 function createCommitObject(shaTree , shaParentCommit , msg  , firstOption)
     {
          let fileContent = `tree ${shaTree}\n`

          if(firstOption == '-p')
               fileContent+= `parent ${shaParentCommit}\n`
          
          const configPath = path.join(process.cwd() , '.git' , 'config')
          const configContent = fs.readFileSync(configPath, 'utf-8')
          let config = parseGitConfig(configContent)
          
          const timeStamp = execSync('date +%s').toString().trim()
          const timeZone  = execSync('date +%z').toString().trim()

          fileContent+= `author ${config.user.name} ${config.user.email} ${timeStamp} ${timeZone}\n` 

          fileContent+= `committer ${config.user.name} ${config.user.email} ${timeStamp} ${timeZone}\n \n`

          fileContent+= `${msg}`

          const length = fileContent.length

          const fullFileContent = `commit ${length}\0${fileContent}`
          
          const fullFileName = crypto.createHash('sha-1')
                                     .update(fullFileContent)
                                     .digest('hex')

          const dir = fullFileName.slice(0 , 2)
          const fileName = fullFileName.slice(2)
          
          fs.mkdirSync(path.join(process.cwd() , '.git' , 'objects' , dir) , {recursive : true})

          fs.writeFileSync(path.join(process.cwd() , '.git' , 'objects' , dir , fileName) , fileCompress(fullFileContent))

          console.log(fullFileName)
     }
 function hashBlobObject(option , fileName)
     {
          gitIsExist()
          
          
          const fullPath = path.join(process.cwd() , fileName)

          switch(option)
               {
                    case "-w" :
                         let fullHashName = hashBlobObjectWrite(fullPath)
                         console.log(fullHashName)
                    break ; 

                    default : 
                         throw new Error(`unkonwn option : ${option}`)
               }
     }
     function ObDecompress(obName)
          {
               let subDir = obName.slice(0 , 2)
               let subName = obName.slice(2)
          
          
               let fullPath = path.join(process.cwd() , ".git" , "objects" , subDir , subName)
               const buffer = fs.readFileSync(fullPath);
               const decompressed = zlib.inflateSync(buffer)
               
               return decompressed

          }

     function fileCompress(fileContent)
          {
               const compressedContent = zlib.deflateSync(fileContent); 
               return compressedContent
          }

  function catFilePrint(obName)
          {
               let decompressed = ObDecompress(obName)
               
               const nullByteIndex = decompressed.indexOf(0)

               let content = decompressed.slice(nullByteIndex + 1).toString()
               
               process.stdout.write(content)
  
          }

  function hashBlobObjectWrite(fullPath)
          {
               
               
               const content   = fs.readFileSync(fullPath)

               const newContent = Buffer.concat([
                    Buffer.from("blob "+content.length+"\0") , 
                    content
               ])
               
               const newFullFileName = crypto.createHash('sha1')
                                        .update(newContent)
                                        .digest('hex')

               const dir = newFullFileName.slice(0 , 2)
               const newFileName = newFullFileName.slice(2)
               
                    
               fs.mkdirSync(path.join(process.cwd(), ".git", "objects" , dir), { recursive: true });   
               const newFullPath = path.join(process.cwd() , ".git" , "objects" , dir , newFileName)
               if(fs.existsSync(newFullPath)) 
                    return dir+newFileName

               else      
                    fs.writeFileSync( newFullPath , fileCompress(newContent))

              
                    

               return dir+newFileName
          }   
  function lsTreeParss(hashName)
          {
               let file = ObDecompress(hashName)
               
                
               let indexOfNull = file.indexOf(0)
               
               file = file.slice(indexOfNull + 1)
               let parssed = []

               while(file.length)
                    {
                        
                         let indexOfSpace = file.indexOf(32)
                         let mode = file.slice(0 , indexOfSpace).toString()
                         
                         file = file.slice(indexOfSpace + 1) 

                         let indexOfNull = file.indexOf(0)
                         let fileName = file.slice(0 , indexOfNull).toString()

                         file = file.slice(indexOfNull + 1)

                         let shaByteEncoded = file.slice(0 , 20)
                         file = file.slice(20)

                         let type = 'blob'
                         if(parseInt(mode , 10) == 40000)
                              type = 'tree'

                         parssed.push([mode , type , shaByteEncoded.toString('hex') , fileName])

                    }

                   parssed.sort((a , b) => {   a[1].charCodeAt(0)    -   b[1].charCodeAt(0)}) 

                   return parssed ; 
               
          }

  function lsTreeSimple(hashName)
          {
               let parssed = lsTreeParss(hashName)

               for(let i = 0 ; i < parssed.length ; i++)
                    console.log(parssed[i][0] , " " , parssed[i][1] , " " , parssed[i][2] , "  ", parssed[i][3])

          }  
          
   function lsTreeNameOnly(hashName)
          {
               let parssed = lsTreeParss(hashName)

               for(let i = 0 ; i  <  parssed.length ; i++)
                         console.log(parssed[i][3])
          }
          
     function writeTreeSimple(currDir)
          {    
               
               let entries = fs.readdirSync(currDir , { withFileTypes: true })
              
               let buff = Buffer.alloc(0);

               for(const entry of entries)
                    {
                         let mode , name , shaBinary 
                         
                         name = entry.name
                         const fullPath = path.join(currDir , name)
                         
                         if(name == '.git')
                              continue 

                         if(entry.isDirectory())
                              {
                                   shaBinary = writeTreeSimple(fullPath)
                                   mode = "040000"
                              }
                         

                         else {
                                   if(entry.isSymbolicLink())
                                        mode = "120000"
                                   
                                   

                                   else if(isExe(fullPath))
                                         mode = "100755"
                              

                                   else 
                                         mode = "100644"


                                   
                                   shaBinary = hashBlobObjectWrite(fullPath)

                                   
                              }
                        
                              
                              let newBuff = Buffer.concat([
                                        Buffer.from(mode , 'utf-8') , 
                                        Buffer.from(' ' , 'utf-8') , 
                                        Buffer.from(name , 'utf-8') , 
                                        Buffer.from('\0' , 'utf-8') , 
                                        Buffer.from(shaBinary , 'hex') 
                              ])
                              
                              buff = Buffer.concat([buff , newBuff])
                              

                    }

                    let length = buff.length 
                    buff = Buffer.concat([
                              Buffer.from(`tree ${length}\0` , 'utf-8') , 
                              buff
                    ])

                    const newFullHashDirName = crypto.createHash('sha1')
                                        .update(buff)
                                        .digest('hex')

                    const dir = newFullHashDirName.slice(0 , 2)
                    const treeHashName = newFullHashDirName.slice(2)
                    
                    fs.mkdirSync(path.join(process.cwd(), ".git", "objects" , dir), { recursive: true });   
                     
                    if(!fs.existsSync(path.join(process.cwd() , ".git" , "objects" , dir , treeHashName)))
                         fs.writeFileSync(path.join(process.cwd() , ".git" , "objects" , dir , treeHashName) , fileCompress(buff))     

                    
                    
                    return newFullHashDirName
          }     
   function gitIsExist()
          {
               let gitPath = path.join(process.cwd()  , ".git")

          

               if(!fs.existsSync(gitPath) || !fs.lstatSync(gitPath).isDirectory())
                    throw new Error("there is no git repo , try to run myGit init first !")
          }

   function isExe(filePath)
          {
            
            
            const stats = fs.statSync(filePath);
            const mode = stats.mode;

            const isExec = (mode & 0o111) !== 0; // Owner, group, or others have exec permission
            
            return isExec;

          }       
          
 function parseGitConfig(content)
          {
                   const lines = content.split('\n');
                   let currentSection = null;
                   const config = {};

                    for (let line of lines) {
                         line = line.trim();

        
                    if (!line || line.startsWith('#')) continue;

        
                    const sectionMatch = line.match(/^\[(.+?)\]$/);
                    if (sectionMatch) {
                         currentSection = sectionMatch[1];
                         config[currentSection] = {};
                          continue;
                          }

        
                    const kvMatch = line.match(/^([a-zA-Z0-9]+)\s*=\s*(.+)$/);
                     if (kvMatch && currentSection) {
                         const key = kvMatch[1];
                         const value = kvMatch[2];
                         config[currentSection][key] = value;
                         }
                 }

               return config;
          }
     
     function serializeConfig(config) {
               let result = '';
               for (const section in config) {
                    result += `[${section}]\n`;
                    for (const key in config[section]) {
                         result += `    ${key} = ${config[section][key]}\n`;
                    }
                    result += `\n`;     
               }

               return result.trim() + '\n';
     }
     
     function httpRequest(options , body = null , binary = false)
          {

               return new Promise((resolve , reject) => {

                    const req = https.request(options , (res)=>{
                         
                         const chunks = []

                         res.on("data" , (chunk)=>{chunks.push(chunk)})
                         res.on("end"  , (chunk)=>{
                              const result = Buffer.concat(chunks)
                              resolve(binary ? result : result.toString("utf-8"))
                         })


                    })
                    
                    req.on("error" , reject)

                    if(body)
                         req.write(body)

                    req.end()
               })
          }     
   