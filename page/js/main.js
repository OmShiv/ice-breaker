
var App = (function(w, d, n, $) {

    var $header = $('#ice-header'),
        $main = $('#main'),
        $c2aDiv = $main.find('.c2a'),
        $c2aForm = $('#c2a-form'),
        $c2aToggle = $('#c2a-toggle'),
        $hdrToggle = $('#hdr-toggle'),
        actions = {},
        $mainVideo = $('#main-video'),
        $overlayVideo = $('#overlay-video');
        firstPlayed = false;

    var constraints = {
        video: true,    // ask for Camera
        audio: true     // ask for Microphone
    }

    // Defining a common method by checking vendor prefixes
    n.getMedia = ( 
        n.getUserMedia ||       // default
        n.webkitGetUserMedia || // Chrome and Safari
        n.mozGetUserMedia ||    // Firefox
        n.msGetUserMedia);      // IE 9, 10

    w.RTCPeerConnection = w.webkitRTCPeerConnection || w.mozRTCPeerConnection;

    var socket = new WebSocket('ws://' + window.location.host + window.location.pathname);

    socket.onmessage = function(message) {
        var msg = JSON.parse(message.data);

        switch(msg.type) {
            case 'assigned_id' :
            socket.id = msg.id;
            break;

        case 'received_offer' : 
            console.log('received offer', msg.data);
            pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            pc.createAnswer(function(description) {
                console.log('sending answer');
                pc.setLocalDescription(description); 
                socket.send(
                    JSON.stringify({
                        type: 'received_answer', 
                        data: description
                    })
                );
            }, null, mediaConstraints);
            break;

        case 'received_answer' :
            console.log('received answer');
            if(!connected) {
                pc.setRemoteDescription(new RTCSessionDescription(msg.data));
                connected = true;
            }
            break;

        case 'received_candidate' :
            console.log('received candidate');
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: msg.data.label,
                candidate: msg.data.candidate
            });
            pc.addIceCandidate(candidate);
            break;
        }
    };

    var pc,
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
    // Doesn't run in stable Mozilla
    pc = new w.RTCPeerConnection(configuration);

    pc.onicecandidate = function(e) {
        if(e.candidate) {
            socket.send(
                JSON.stringify({
                    type: 'received_candidate',
                    data: {
                        label: e.candidate.sdpMLineIndex,
                        id: e.candidate.sdpMid,
                        candidate: e.candidate.candidate
                    }
                })
            );
        }
    };

    pc.onaddstream = function(e) {
        console.log('remote start video stream');
        setVideoSrc($overlayVideo[0], e.stream);
        $overlayVideo[0].play();
        $overlayVideo.removeClass('overlay');
        $mainVideo.addClass('overlay');
    };

    // Privates

    function setVideoSrc(el, s) {
        if (n.mozGetUserMedia) { 
            el.mozSrcObject = s; // only for FF
        } else {
            var vendorURL = w.URL || w.webkitURL;
            el.src = vendorURL.createObjectURL(s);
        }
    }

    function playMainVideo() {

      // gets local video stream and renders to vid1
        n.getMedia( constraints, function(localMediaStream) {
            pc.addStream(localMediaStream);

            setVideoSrc($mainVideo[0], localMediaStream);

            $mainVideo[0].play(); // not doing this doesn't work in some browsers
            $mainVideo[0].title = 'Double click on video to launch full screen!';

            // initCall is set in views/index and is based on if there is another person in the room to connect to
            if(initCall)
              start();
        }, mainVideoError);
    }

    function start() {
      // this initializes the peer connection
        pc.createOffer(function(description) {
            pc.setLocalDescription(description);
            socket.send(
                JSON.stringify({
                    type: 'received_offer',
                    data: description
                })
            );
        }, null, mediaConstraints);
    }

    function closePeer() {
        socket.send(
            JSON.stringify({
                type: 'close'
            })
        );

        pc.close();
        pc = null;

        $mainVideo.removeClass('overlay');
        $overlayVideo.addClass('overlay');
        firstPlayed = false;
    };

    // window.onload = function() {
    //   playMainVideo();
    // };

    w.onbeforeunload = function() {
        closePeer();
    }

    function setFullScreen(el) {
        el.requestFullScreen = (
            el.requestFullScreen ||
            el.mozRequestFullScreen ||
            el.mozRequestFullScreen ||
            el.webkitRequestFullScreen);
        
        el.requestFullScreen();
    }

    function mainVideoError(err) {
        console.log("The following error occured: " + err + " -- with code: " + err.code);
    }

    return {
        init: function() {
            $('.circles.action').find('a').each(function(){
                actions[$(this).attr('class')] = $(this);
            });

            this.bindEvents();
        },
        bindEvents: function() {
            // UI

            var _this = this;

            $('.circles.action').on('click', 'a', function(e) {
                e.preventDefault();
            });

            $c2aToggle.on('click', function(e) {
                e.preventDefault();
                $c2aDiv.css('right', 
                    $c2aDiv.css('right') == '-275px' ? 0 : '-275px' 
                );
            });

            $hdrToggle.on('click', function(e) {
                e.preventDefault();
                $header.css('top', 
                    $header.css('top') == '-127px' ? 0 : '-127px' 
                );
                $c2aToggle.css('top', 
                    $header.css('top') == '0px' ? '18px' : '145px'
                );
            });

            $mainVideo.on('dblclick', function() {
                setFullScreen($mainVideo[0]);
            });

            // Video
            actions['web-cam'].on('click', function() {
                !firstPlayed && playMainVideo();
                firstPlayed = true;
            });

            actions['tag'].on('click', function() {
                $c2aToggle.click();
            });

            actions['disconnect'].on('click', function() {
                closePeer();
            });

            // C2A
            $('#add-action').on('click', function() {
                var data = {};
                if ( $('#member-name').val() !="" && 
                     $('#member-name').val() != "") {
                    data.memberName = $('#member-name').val()
                    data.memberNotes = $('#member-notes').val()
                }
                _this.addAction( data );
            })

        },
        addAction: function(data) {
            var tpl;
            if (!data.memberName || !data.memberNotes) return;
            
            tpl = '<div class="action-item">'+
            '<div class="name">' + data.memberName + '</div>' +
            '<div class="action">' + data.memberNotes + '</div>' +
            '</div>'+
            '<div class="separator"></div>';

            $c2aDiv.append(tpl);
        }
    }

}(window, document, navigator, $));

App.init();