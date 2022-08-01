# Installing on Qlik Saas (qlikcloud.com)

[back](./readme.md) 

The extension can be used on Qlik Cloud editions as well. For the users it will work with *no further* configuration. If you want *to edit* the tour 
(=develop the tour content on qlikcloud.com) you need to 
 * either use the databridge cloud location from the dropdown Tour Editor Location (that is https://qs-i-dev.databridge.ch/anonym/extensions/ext_guided_tour_2/editor/editor.html)
 * or deploy the editor folder from this repo on a web server of your choice and specify the url under "other"
```
Note: there is no data being sent to that web host origin, just the html, css and js files are being loaded
```
![image](https://user-images.githubusercontent.com/15999058/158422861-e3d96488-dd73-427e-9b72-a3f0e936f672.png)
 
 * set a CSP (Content Source Policy) in the Cloud Management console of your qlikcloud tenant to whitelist the origin of the editor
 
![image](https://user-images.githubusercontent.com/15999058/158422823-91370231-4460-403f-9152-18b00b2e5997.png)

The reason for this is, that the editor has quite some source code and dependencies, therefore it is kept within an iframe and loaded only when editing is needed. 
Unlike Qlik Sense Windows Servers, Qlik Cloud doesn't act as a web-server for website content. The iframe content needs to be sourced from another origin. 


You can prove this in the browser's Network Monitor, that no communication other than the GET for the editors resources is going out. 

