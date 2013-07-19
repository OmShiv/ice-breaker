
var peerConnection,
    socket = new WebSocket('ws://' + window.location.host + window.location.pathname);

socket.onmessage = function(message) {
  var msg = JSON.parse(message.data);

  switch(msg.type) {
    case 'assigned_id' :
      socket.id = msg.id;
      break;
    case 'received_offer' : 
      console.log('received offer', msg.data);
      peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
      peerConnection.createAnswer(function(description) {
        console.log('sending answer');
        peerConnection.setLocalDescription(description); 
        socket.send(JSON.stringify({
          type: 'received_answer', 
          data: description
        }));
      }, null, mediaConstraints);
      break;
    case 'received_answer' :
      console.log('received answer');
      if(!connected) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
        connected = true;
      }
      break;

    case 'received_candidate' :
      console.log('received candidate');
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: msg.data.label,
        candidate: msg.data.candidate
      });
      peerConnection.addIceCandidate(candidate);
      break;
  }
};

var 
    // the famous Google STUN
    configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
    stream,

    connected = false,
    mediaConstraints = {
        'mandatory': {
            'OfferToReceiveAudio':true, 
            'OfferToReceiveVideo':true
        }
    };

// For peer
peerConnection = new webkitRTCPeerConnection(configuration);

peerConnection.onicecandidate = function(e) {
    if(e.candidate) {
        socket.send(JSON.stringify({
            type: 'received_candidate',
            data: {
                label: e.candidate.sdpMLineIndex,
                id: e.candidate.sdpMid,
                candidate: e.candidate.candidate
            }
        }));
    }
};

peerConnection.onaddstream = function(e) {
    console.log('start remote video stream');
    vid2.src = webkitURL.createObjectURL(e.stream);
    vid2.play();
};

function broadcast() {
  // gets local video stream and renders to vid1
    navigator.webkitGetUserMedia({audio: true, video: true}, function(s) {
        stream = s;
        peerConnection.addStream(s);
        vid1.src = webkitURL.createObjectURL(s);
        vid1.play();
        // initCall is set in views/index and is based on if there is another person in the room to connect to
        if(initCall)
            start();
    });
}

function start() {
    // this initializes the peer connection
    peerConnection.createOffer(function(description) {
        peerConnection.setLocalDescription(description);
        socket.send(JSON.stringify({
            type: 'received_offer',
            data: description
        }));
    }, null, mediaConstraints);
}

window.onload = function() {
  broadcast();
};

window.onbeforeunload = function() {
    socket.send(JSON.stringify({
        type: 'close'
    }));
    peerConnection.close();
    peerConnection = null;
};
