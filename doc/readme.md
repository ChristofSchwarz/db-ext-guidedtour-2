# Documentation

## Use on Qlik SaaS (qlikcloud.com)

The extension can be used on Qlik Cloud editions as well. For the users it will work with *no further* configuration. If you want *to edit* the tour 
(=develop the tour content on qlikcloud.com) you need to 
 * either use the databridge cloud location qs-i-dev.databridge.ch
 * or deploy the editor folder from this repo on a web server of your choice and specify the url under "other"
```
Note: there is no data being sent to that web host origin, just the html, css and js files are being loaded
```
<img src="./pic/editor1.png" style="height:500px">
 
 * set a CSP (Content Source Policy) in the Cloud Management console of your qlikcloud tenant to whitelist the origin of the editor
 
 ![image](https://user-images.githubusercontent.com/15999058/158419047-d1a53d87-2196-4ea4-ad64-d632c5efac19.png)

The reason for this is, that the editor has quite some source code and dependencies, therefore it is kept within an iframe and loaded only when editing is needed. 
Unlike Qlik Sense Windows Servers, Qlik Cloud doesn't act as a web-server for website content. The iframe content needs to be sourced from another origin. 


You can prove this in the browser's Network Monitor, that traffic is going to the editor's 

