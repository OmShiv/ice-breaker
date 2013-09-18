
var App = (function(w, d, n, $) {

    var peerCon,
        $header = $('#ice-header'),
        $main = $('#main'),
        $c2aDiv = $main.find('.c2a'),
        $c2aForm = $('#c2a-form'),
        $c2aToggle = $('#c2a-toggle'),
        $hdrToggle = $('#hdr-toggle'),
        actions = {},
        msgCounter = 0,
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
            case 'uuid' :
                socket.id = msg.id;
            break;

            case 'offered' : 
                console.log('Received offer', msg.data);
                peerCon.setRemoteDescription(new RTCSessionDescription(msg.data));
                peerCon.createAnswer(function(description) {
                    console.log('Answering');
                    peerCon.setLocalDescription(description); 
                    socket.send(
                        JSON.stringify({
                            type: 'answered', 
                            data: description
                        })
                    );
                }, null, mediaConstraints);
                break;

            case 'answered' :
                console.log('Received answer');
                if(!connected) {
                    peerCon.setRemoteDescription(new RTCSessionDescription(msg.data));
                    connected = true;
                }
                break;

            case 'candidate' :
                console.log('Received ICE request');
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: msg.data.label,
                    candidate: msg.data.candidate
                });
                peerCon.addIceCandidate(candidate);
                break;

            case 'node-debug' :
                console.log('===== Node Debug: =====');
                console.log(msg.key, ' ==> ', msg.value);
                console.log('== // Node Debug. =====');
                break;
        }
    };

    var 
        // the famous Google STUN server for signaling
        configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]},
        connected = false,
        mediaConstraints = {
            'mandatory': {
                'OfferToReceiveAudio':true, 
                'OfferToReceiveVideo':true
            }
        };

    // For peer
    // Doesn't run in stable Mozilla
    peerCon = new w.RTCPeerConnection(configuration);

    peerCon.onicecandidate = function(e) {
        if(e.candidate) {
            socket.send(
                JSON.stringify({
                    type: 'candidate',
                    data: {
                        label: e.candidate.sdpMLineIndex,
                        id: e.candidate.sdpMid,
                        candidate: e.candidate.candidate
                    }
                })
            );
        }
    };

    peerCon.onaddstream = function(e) {
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
            peerCon.addStream(localMediaStream);

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
        peerCon.createOffer(function(description) {
            peerCon.setLocalDescription(description);
            socket.send(
                JSON.stringify({
                    type: 'offered',
                    data: description
                })
            );
        }, null, mediaConstraints);
    }

    function closePeer(windowUnloaded) {
        socket.send(
            JSON.stringify({
                type: 'close'
            })
        );

        peerCon.close();
        peerCon = null;

        $mainVideo.removeClass('overlay');
        if (!windowUnloaded) $overlayVideo.addClass('overlay');
        firstPlayed = false;
    };

    // window.onload = function() {
    //   playMainVideo();
    // };

    w.onbeforeunload = function() {
        closePeer(true);
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
            });

            $('#clear-action').on('click', function() {
                $c2aDiv.find('.item-holder').remove();
            });

        },
        addAction: function(data) {
            var tpl;
            if (!data.memberName || !data.memberNotes) return;
            
            msgCounter ++;

            tpl = ''+
            '<div class="item-holder">'+
            '<div class="action-item">'+
                '<div class="name">' + data.memberName + '</div>' +
                '<div class="action">' + data.memberNotes + '</div>' +
                '</div>'+
            '<div class="separator"></div>'+
            '</div>';
            
            $c2aDiv.append( 
                $(tpl)
                .on('click', function(){
                    $(this).addClass('do-not-remove');
                })
                .delay(2000).fadeIn(1, function(){
                    $(this).hasClass('do-not-remove') || $(this).remove();
                    $c2aDiv.removeClass('highlight');
                }) 
            ).addClass('highlight');

        }
    }

}(window, document, navigator, $));

App.init();