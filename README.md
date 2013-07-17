Ice-breaker
===========

WebRTC enabled HTML5 App for real-time collaboration

Supports:
* Video Chat

Upcoming:
* File Sharing
* Screen-Sharing
* Audio only calls
* Video calls recording and tagging
* ISS - Immediate Screenshots sharing 
** (Windows only - requires pressing Print-screen, and then pressing Ctrl + V in the app) 

Briefly:

An in-browser plugin-independent app 

Its UI is built on top of plain HTML5, JavaScript and CSS3 (and some jQuery which can be painlessly removed)

Reuires Node.js at the backend with the following modules:
* Express
* Websocket.io
* Jade
* UUID

Modules have been checked in. If they are already installed on your deployment machines, you can simply ignore node_modules

This app Relies on Websockets via NodeJS unlike the famous Google App Engine WebRTC demo (thank you Node community for appreciation)