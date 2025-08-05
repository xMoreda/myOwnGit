const fs = require("fs");
const path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');
const { execSync } = require('child_process');
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
     
          
   