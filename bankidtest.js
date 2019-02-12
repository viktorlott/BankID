const axios = require("axios")
const https = require("https")
const fs = require("fs")
const path = require("path")
const ora = require('ora');

const URL = "https://appapi2.test.bankid.com/rp/v5"


const { Form } = require('enquirer');


class Certificate {
  constructor() {
    this.pfx = this.selectFile("FPTestcert2_20150818_102329.pfx")
    this.ca = this.selectFile("test.ca", "utf-8")
    this.passphrase = "qwerty123"
  }
  selectFile(name, type) {
    return fs.readFileSync(path.resolve(__dirname,"./cert", name), type)
  }
  static get() {
    const temp = new Certificate()
    return {
      pfx: temp.pfx,
      ca: temp.ca,
      passphrase: temp.passphrase
    }
  }
}
class BankID {
  constructor() {
    this.certificate = Certificate.get()
    this.call = this.setupAxiosRequest()

  }
  setupAxiosRequest() {
    return axios.create({
      httpsAgent: new https.Agent(this.certificate),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  async repeat(ref, ast) {
    let state = true
    const spinner = ora('Axios POST request...').start();
    return new Promise(((resolve, reject) => {
        spinner.succeed("Axios POST request complete")
        let spinner2;
      this.collect(ref, ast).then(after => {
          spinner2 = ora('Waiting for user signature...').start();
      })
  
      let timer = setInterval(() => {
       this.call.post(URL + "/collect", JSON.stringify({orderRef: ref})).then(res => {
         if(res.data.status === "failed") {
          clearInterval(timer)
          reject(res.data)
         } else if(res.data.status === "pending") {
  
         } else if(res.data.status === "complete") {
          spinner2.succeed("User signed!")
          clearInterval(timer)
          resolve(res.data)
        } 
       })
      }, 2000)
    }))
  }

  async sign(ip, pno, msg) {
    const data = {
      "personalNumber": pno,
      "endUserIp": ip,
      "userVisibleData": Buffer.from(msg).toString("base64")
     }
     const spinner = ora('Establishing connection with BankID Service\n\n    - Personal Number : ' + pno + '\n    - IP              : ' + ip + "\n").start();
     this.call.post(URL + "/sign", data).then(async res => {
      spinner.succeed()
      const AST = res.data.autoStartToken,
            OR  = res.data.orderRef
      const data = await this.repeat(OR, AST)
      //  console.log(res.data)
               console.log("")
               console.log(" ---- SUCCESS ---- ")
               console.log("Status        -> ",data.status)
               console.log("Reference     -> ",data.orderRef, "\n\n")
               console.log("  User Information   ", "\n")
               console.log("     Name            : ", data.completionData.user.name)
               console.log("     Surname         : ", data.completionData.user.surname)
               console.log("     Personal Number : ", data.completionData.user.personalNumber)
               console.log("     Signature       : ", data.completionData.signature.substring(0, 100) + "...")
               console.log("\n  END")
      
  
     })
  }
  collect(ref, ast) {
    return new Promise((resolve, reject) => {
        this.call.post(URL + "/collect", JSON.stringify({orderRef: ref})).then(res => {
             console.log("")
             console.log("   -- POST REQUEST --  ")
             console.log("Status    -> ",res.data.status)
             console.log("Hint Code -> ",res.data.hintCode)
             console.log("Reference -> ",ref)
             console.log("Token     -> ",ast, "\n")
             resolve()
      }).catch(err => console.log(reject(err)))
    })
  }
  async terminal_query() {
    const prompt = new Form({
        name: 'user',
        message: 'Fill in details for HTTPS Request:',
        choices: [
          { name: 'pno', message: 'Personal Number', initial: '199512105553'},
          { name: 'ip', message: 'IP', initial: '127.0.0.1' },
        ]
      })
      prompt.run()
      .then(value => {
          this.sign(value.ip, value.pno, "This is a test by Viktor - Please, sign this request.")
      })
      .catch(console.error);
  }

  info() {
    console.log(information)
  }
}


const information = `
 (REST API Links)
      - Production
          \\__ https://appapi2.bankid.com/rp/v5 

      - Test Environment 
          \\__ https://appapi2.test.bankid.com/rp/v5 


 (REST API Methods)
      - /rp/v5/auth
              POST
              Content-Type: application/json
              {
                  "endUserIp": "194.168.2.25"
              }

      - /rp/v5/sign
              POST
              Content-Type: application/json
              {
                  "personalNumber":"190000000000",
                  "endUserIp": "194.168.2.25",
                  "userVisibleData": "IFRoaXMgaXMgYSBzYW1wbGUgdGV4dCB0byBiZSBzaWduZWQ="
              }

      ^^ RESPONSE FOR SIGN AND AUTH ^^
              200 OK
              Content-Type: application/json
              {
                  "orderRef":"131daac9-16c6-4618-beb0-365768f37288",
                  "autoStartToken":"7c40b5c9-fa74-49cf-b98c-bfe651f9a7c6"
              }

      _______________________________________________________________________________________

      - /rp/v5/collect
              POST
              Content-Type: application/json
              {
                  "orderRef":"131daac9-16c6-4618-beb0-365768f37288"
              }

      ^^ RESPONSE FOR COLLECT ^^
              200 OK
              Content-Type: application/json
              {
                  "orderRef":"131daac9-16c6-4618-beb0-365768f37288",
                  "status":"pending",
                  "hintCode":"userSign"
              }

      _______________________________________________________________________________________

 (Opening BankID on devices)
    
      - iOS
          \\__ https://app.bankid.com/?autostarttoken=[TOKEN]&redirect=[RETURNURL]

      - Android and others
          \\__ bankid:///?autostarttoken=[TOKEN]&redirect=[RETURNURL]

      - [autostarttoken]:
              Holds the autoStartToken that was returned from the web service call. If the user personal
              number was not included in the web service call the autostarttoken must be provided.
              We strongly recommend to always use the autostarttoken when the URL is used to start the
              client. If it is not included and the user reloads the page or if the page erroneously repeats the
              start command, the user may get an error claiming that the BankID is missing. The likelihood
              of this to happen is reduced if autostarttoken is used.
              Note that the parameter names must be lower case.
`


const bank = new BankID() 

module.exports = BankID
process.argv.forEach(val => {
  if(val == "-i") bank.info()
  if(val == "-q") bank.terminal_query() 
})










// async function questions() {
//     const prompt = new Form({
//         name: 'user',
//         message: 'Fill in details for HTTPS Request:',
//         choices: [
//           { name: 'pno', message: 'Personal Number', initial: '199512105553'},
//           { name: 'ip', message: 'IP', initial: '127.0.0.1' },
//         ]
//       })
//       prompt.run()
//       .then(value => {
//           sign(value.ip, value.pno, "This is a test by Viktor - Please, sign this request.")
//       })
//       .catch(console.error);
      
// }









// const selectFile = (name, type) => fs.readFileSync(path.resolve(__dirname,"./cert", name), type)
// // FPTestcert2_20150818_102329
// // "https://appapi2.test.bankid.com/rp/v5"


// const agent = new https.Agent({ 
//   pfx: selectFile("FPTestcert2_20150818_102329.pfx"), 
//   ca: selectFile("test.ca", "utf-8"),
//   passphrase: "qwerty123"
// })

// const as = axios.create({
//   httpsAgent: agent,
//   headers: {
//     "Content-Type": "application/json"
//   }
// });
// async function repeat(ref, ast) {
//   let state = true
//   const spinner = ora('Axios POST request...').start();
//   return new Promise(((resolve, reject) => {
//       spinner.succeed("Axios POST request complete")
//       let spinner2;
//     collect(ref, ast).then(after => {
//         spinner2 = ora('Waiting for user signature...').start();
//     })

//     let timer = setInterval(() => {
//      as.post(URL + "/collect", JSON.stringify({orderRef: ref})).then(res => {
//        if(res.data.status === "failed") {
//         clearInterval(timer)
//         reject(res.data)
//        } else if(res.data.status === "pending") {

//        } else if(res.data.status === "complete") {
//         spinner2.succeed("User signed!")
//         clearInterval(timer)
//         resolve(res.data)
//       } 
//      })
//     }, 2000)
//   }))
// }
 
// function collect(ref, ast) {
//     return new Promise((resolve, reject) => {
//         as.post(URL + "/collect", JSON.stringify({orderRef: ref})).then(res => {
//              console.log("")
//              console.log("   -- POST REQUEST --  ")
//              console.log("Status    -> ",res.data.status)
//              console.log("Hint Code -> ",res.data.hintCode)
//              console.log("Reference -> ",ref)
//              console.log("Token     -> ",ast, "\n")
//              resolve()
//       }).catch(err => console.log(reject(err)))
//     })
// }



// async function sign(ip, pno, msg) {
//   const data = {
//     "personalNumber": pno,
//     "endUserIp": ip,
//     "userVisibleData": Buffer.from(msg).toString("base64")
//    }
//    const spinner = ora('Establishing connection with BankID Service\n\n    - Personal Number : ' + pno + '\n    - IP              : ' + ip + "\n").start();
//    as.post(URL + "/sign", data).then(async res => {
//     spinner.succeed()
//     const AST = res.data.autoStartToken,
//           OR  = res.data.orderRef
    
//     const data = await repeat(OR, AST)
//     //  console.log(res.data)
//              console.log("")
//              console.log(" ---- SUCCESS ---- ")
//              console.log("Status        -> ",data.status)
//              console.log("Reference     -> ",data.orderRef, "\n\n")
//              console.log("  User Information   ", "\n")
//              console.log("     Name            : ", data.completionData.user.name)
//              console.log("     Surname         : ", data.completionData.user.surname)
//              console.log("     Personal Number : ", data.completionData.user.personalNumber)
//              console.log("     Signature       : ", data.completionData.signature.substring(0, 100) + "...")
//              console.log("\n  END")


//    })
// }
// // 199512105553

