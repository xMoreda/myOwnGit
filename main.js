const fs = require("fs");
const path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');

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
     hashObject(process.argv[3] , process.argv[4]);     
     break;    
   case "ls-tree":
     lsTree(process.argv[3] , process.argv[4])
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
  function lsTree(option , hashName)
     {
          gitIsExist()

          switch(option)
               {
                    case "--name-only":
                         lsTreeNameOnly(hashName) 
                    break ; 
                    
                    default:
                         lsTree(hashName)
               }
     }       
 function hashObject(option , fileName)
     {
          gitIsExist()

          switch(option)
               {
                    case "-w" :
                         hashObjectWrite(fileName)
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

  function hashObjectWrite(fileName)
          {
               const filePath = path.join(process.cwd() , fileName)
               
               const content   = fs.readFileSync(filePath)

               const newContent = Buffer.concat([
                    Buffer.from("blob "+content.length+"\0") , 
                    content
               ])
               
               const newFullFileName = crypto.createHash('sha1')
                                        .update(newContent)
                                        .digest('hex')

               const dir = newFullFileName.slice(0 , 2)
               const newFileName = newFullFileName.slice(2)
               process.stdout.write(dir+newFileName)
               fs.mkdirSync(path.join(process.cwd(), ".git", "objects" , dir), { recursive: true });                         
               fs.writeFileSync(path.join(process.cwd() , ".git" , "objects" , dir , newFileName) , fileCompress(newContent))

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

  function lsTree(hashName)
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
   function gitIsExist()
          {
               let gitPath = path.join(process.cwd()  , ".git")

          

               if(!fs.existsSync(gitPath) || !fs.lstatSync(gitPath).isDirectory())
                    throw new Error("there is no git repo , try to run myGit init first !")
          }
          
      
          
          
   