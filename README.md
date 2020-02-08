# BankID

### Identity verification

> This is an implementation for the Swedish BankID Authorization Solution

### BankID Authentication

 This is built from reading the [Relying Party Guidelines](https://www.bankid.com/bankid-i-dina-tjanster/rp-info).
 
 NOT using a third pary solution like for example, *Svensk eID*.
 
 Directly communicates with BankID's RESTful API, using their TEST certificates. If you want a production Certification you will need to be a company and then contact your bank and ask for them to issue a end user SSL certificate. 
 
 
 How the certificate process works:
 
   BankID is the Root Certificate Authority.
   
     \\___ They sign and issue Intermediate Certificates to BANKS
     
             \\___ The Banks issue end user SSL certificate for companies.




 
##### Implementerat BankID
