# Documentation

## Use on Qlik SaaS (qlikcloud.com)

The extension can be used on Qlik Cloud editions as well. For the users it will work with no further configuration. If you want to edit the tour 
(=develop the tours on qlikcloud.com) you need to set a CSP (Content Source Policy) in the cloud management console, because the editor is within
an iframe and because Qlik Cloud doesn't act as a web-server, the iframe content itself needs to be loaded from another web host.

| Note: there is **no data** being sent to that web host origin, only the html, css and js files are being loaded from there. You can prove this in the Network monitor. |

