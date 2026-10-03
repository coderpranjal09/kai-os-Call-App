(function () {

    "use strict";


    /*
     * WebRTC configuration
     *
     * Empty ICE server list means
     * local/direct connection only.
     */

    var rtcConfig = {
        iceServers: []
    };


    var peer = null;

    var localStream = null;

    var connected = false;

    var remoteDescriptionReady = false;


    var statusDot =
        document.getElementById("statusDot");

    var connectionText =
        document.getElementById("connectionText");

    var connectionSub =
        document.getElementById("connectionSub");

    var speaker =
        document.getElementById("speaker");

    var talkButton =
        document.getElementById("talkButton");

    var audioStatus =
        document.getElementById("audioStatus");

    var remoteAudio =
        document.getElementById("remoteAudio");

    var codePanel =
        document.getElementById("codePanel");

    var connectionCode =
        document.getElementById("connectionCode");


    /*
     * UI
     */

    function setStatus(type, title, sub) {

        statusDot.className =
            "status-dot " + type;

        connectionText.textContent =
            title;

        connectionSub.textContent =
            sub;
    }


    function setTalking(value) {

        if (value) {

            talkButton.className =
                "talk-button talking";

            speaker.className =
                "speaker active";

            speaker.textContent =
                "TRANSMITTING";

            audioStatus.textContent =
                "Talking";

        } else {

            talkButton.className =
                "talk-button";

            speaker.className =
                "speaker";

            speaker.textContent =
                "READY";

            audioStatus.textContent =
                "Standby";
        }
    }


    /*
     * Create WebRTC connection
     */

    function createPeer() {

        if (peer) {
            return;
        }

        if (typeof RTCPeerConnection === "undefined") {

            setStatus(
                "offline",
                "WebRTC unavailable",
                "This device does not support WebRTC"
            );

            return;
        }


        peer =
            new RTCPeerConnection(
                rtcConfig
            );


        peer.onicecandidate =
            function (event) {

                /*
                 * ICE candidate collection
                 * is handled by waitForICE().
                 */
            };


        peer.onconnectionstatechange =
            function () {

                var state =
                    peer.connectionState;

                if (state === "connected") {

                    connected = true;

                    setStatus(
                        "online",
                        "Connected",
                        "Peer connection active"
                    );

                } else if (
                    state === "disconnected" ||
                    state === "failed"
                ) {

                    connected = false;

                    setStatus(
                        "offline",
                        "Disconnected",
                        "Connection lost"
                    );
                }
            };


        peer.ontrack =
            function (event) {

                if (event.streams &&
                    event.streams[0]) {

                    remoteAudio.srcObject =
                        event.streams[0];

                    remoteAudio.play()
                        .catch(function () {});

                }
            };
    }


    /*
     * Microphone
     */

    function getMicrophone() {

        if (localStream) {
            return Promise.resolve(
                localStream
            );
        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            setStatus(
                "offline",
                "Microphone unavailable",
                "KaiOS API not available"
            );

            return Promise.reject(
                new Error(
                    "getUserMedia unavailable"
                )
            );
        }


        return navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: false
            })
            .then(function (stream) {

                localStream = stream;


                stream.getTracks()
                    .forEach(function (track) {

                        /*
                         * Start muted.
                         * Audio is enabled only
                         * while TALK is pressed.
                         */

                        track.enabled = false;

                        peer.addTrack(
                            track,
                            stream
                        );

                    });


                return stream;
            });
    }


    /*
     * Wait for ICE gathering
     */

    function waitForICE() {

        return new Promise(function (resolve) {

            if (
                peer.iceGatheringState ===
                "complete"
            ) {

                resolve();

                return;
            }


            function check() {

                if (
                    peer.iceGatheringState ===
                    "complete"
                ) {

                    peer.removeEventListener(
                        "icegatheringstatechange",
                        check
                    );

                    resolve();
                }
            }


            peer.addEventListener(
                "icegatheringstatechange",
                check
            );


            /*
             * Safety timeout.
             */

            setTimeout(
                resolve,
                5000
            );
        });
    }


    /*
     * CREATE OFFER
     */

    document
        .getElementById("createOffer")
        .onclick =
        function () {

            createPeer();


            getMicrophone()

                .then(function () {

                    return peer.createOffer();

                })

                .then(function (offer) {

                    return peer.setLocalDescription(
                        offer
                    );

                })

                .then(function () {

                    return waitForICE();

                })

                .then(function () {

                    var data = {
                        type: "offer",
                        sdp:
                            peer.localDescription.sdp
                    };


                    connectionCode.value =
                        JSON.stringify(data);


                    codePanel.className =
                        "code-panel";


                    setStatus(
                        "offline",
                        "Offer created",
                        "Send this code to the other phone"
                    );

                })

                .catch(function (error) {

                    console.log(error);

                    setStatus(
                        "offline",
                        "Connection error",
                        error.message
                    );
                });
        };


    /*
     * ENTER REMOTE CODE
     */

    document
        .getElementById("acceptOffer")
        .onclick =
        function () {

            var code =
                prompt(
                    "Paste connection code:"
                );


            if (!code) {
                return;
            }


            try {

                var data =
                    JSON.parse(code);


                if (data.type === "offer") {

                    acceptOffer(data);

                } else if (
                    data.type === "answer"
                ) {

                    acceptAnswer(data);

                } else {

                    alert(
                        "Invalid connection code"
                    );
                }

            } catch (error) {

                alert(
                    "Invalid code"
                );
            }
        };


    /*
     * ACCEPT OFFER
     */

    function acceptOffer(data) {

        createPeer();


        getMicrophone()

            .then(function () {

                return peer.setRemoteDescription({

                    type: "offer",

                    sdp: data.sdp

                });

            })

            .then(function () {

                remoteDescriptionReady =
                    true;

                return peer.createAnswer();

            })

            .then(function (answer) {

                return peer.setLocalDescription(
                    answer
                );

            })

            .then(function () {

                return waitForICE();

            })

            .then(function () {

                var answerCode = {

                    type: "answer",

                    sdp:
                        peer.localDescription.sdp

                };


                connectionCode.value =
                    JSON.stringify(
                        answerCode
                    );


                codePanel.className =
                    "code-panel";


                setStatus(
                    "offline",
                    "Answer created",
                    "Send answer back"
                );

            })

            .catch(function (error) {

                console.log(error);

                alert(
                    "Could not create answer"
                );
            });
    }


    /*
     * ACCEPT ANSWER
     */

    function acceptAnswer(data) {

        if (!peer) {

            alert(
                "Create an offer first"
            );

            return;
        }


        peer.setRemoteDescription({

            type: "answer",

            sdp: data.sdp

        })

        .then(function () {

            remoteDescriptionReady =
                true;

            setStatus(
                "online",
                "Connecting...",
                "Waiting for peer"
            );

        })

        .catch(function (error) {

            console.log(error);

            alert(
                "Invalid answer"
            );
        });
    }


    /*
     * TALK BUTTON
     */

    function startTalking() {

        if (!localStream) {

            setStatus(
                "offline",
                "Not ready",
                "Connect first"
            );

            return;
        }


        if (!connected) {

            setStatus(
                "offline",
                "Not connected",
                "Connect to another phone first"
            );

            return;
        }


        localStream
            .getAudioTracks()
            .forEach(function (track) {

                track.enabled = true;

            });


        setTalking(true);
    }


    function stopTalking() {

        if (!localStream) {
            return;
        }


        localStream
            .getAudioTracks()
            .forEach(function (track) {

                track.enabled = false;

            });


        setTalking(false);
    }


    /*
     * Mouse / touchscreen
     */

    talkButton.addEventListener(
        "mousedown",
        startTalking
    );

    talkButton.addEventListener(
        "mouseup",
        stopTalking
    );

    talkButton.addEventListener(
        "mouseleave",
        stopTalking
    );


    talkButton.addEventListener(
        "touchstart",
        function (event) {

            event.preventDefault();

            startTalking();

        }
    );


    talkButton.addEventListener(
        "touchend",
        function (event) {

            event.preventDefault();

            stopTalking();

        }
    );


    /*
     * Keyboard support
     *
     * Useful for KaiOS keypad.
     */

    document.addEventListener(
        "keydown",
        function (event) {

            /*
             * Enter / OK
             */

            if (
                event.key === "Enter" ||
                event.keyCode === 13
            ) {

                startTalking();
            }

        }
    );


    document.addEventListener(
        "keyup",
        function (event) {

            if (
                event.key === "Enter" ||
                event.keyCode === 13
            ) {

                stopTalking();
            }

        }
    );


    /*
     * COPY
     */

    document
        .getElementById("copyCode")
        .onclick =
        function () {

            connectionCode
                .select();

            try {

                document.execCommand(
                    "copy"
                );

                alert(
                    "Code copied"
                );

            } catch (error) {

                alert(
                    "Copy failed. Select and copy manually."
                );
            }
        };


    /*
     * CLOSE
     */

    document
        .getElementById("closeCode")
        .onclick =
        function () {

            codePanel.className =
                "code-panel hidden";
        };


    /*
     * INITIAL STATE
     */

    setStatus(
        "offline",
        "Not connected",
        "Ready to connect"
    );

})();