(function () {

    "use strict";

    /*
     * ==========================================
     * WIFI WALKIE TALKIE
     * WebRTC - Manual Signaling Test Version
     * ==========================================
     *
     * Flow:
     *
     * PHONE A
     *   Create Connection
     *        ↓
     *      OFFER
     *        ↓
     * PHONE B
     *   Enter Offer
     *        ↓
     *      ANSWER
     *        ↓
     * PHONE A
     *   Enter Answer
     *        ↓
     *    CONNECTED
     *
     * Audio is sent directly through WebRTC.
     */


    /*
     * ==========================================
     * WEBRTC CONFIGURATION
     * ==========================================
     *
     * STUN helps WebRTC discover the network path.
     *
     * For your hotspot/local-network test,
     * host candidates should also be generated.
     */

    var rtcConfig = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    };


    /*
     * ==========================================
     * VARIABLES
     * ==========================================
     */

    var peer = null;

    var localStream = null;

    var connected = false;

    var isCaller = false;

    var remoteDescriptionSet = false;


    /*
     * ==========================================
     * UI ELEMENTS
     * ==========================================
     */

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
     * ==========================================
     * STATUS UI
     * ==========================================
     */

    function setStatus(type, title, sub) {

        if (statusDot) {
            statusDot.className =
                "status-dot " + type;
        }

        if (connectionText) {
            connectionText.textContent =
                title;
        }

        if (connectionSub) {
            connectionSub.textContent =
                sub;
        }
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
     * ==========================================
     * WEBRTC SUPPORT CHECK
     * ==========================================
     */

    function checkWebRTC() {

        if (
            typeof RTCPeerConnection ===
            "undefined"
        ) {

            setStatus(
                "offline",
                "WebRTC unavailable",
                "This browser does not support WebRTC"
            );

            return false;
        }

        return true;
    }


    /*
     * ==========================================
     * CREATE PEER
     * ==========================================
     */

    function createPeer() {

        if (peer) {
            return;
        }


        if (!checkWebRTC()) {
            return;
        }


        console.log(
            "Creating RTCPeerConnection"
        );


        peer =
            new RTCPeerConnection(
                rtcConfig
            );


        /*
         * --------------------------------------
         * ICE CANDIDATE
         * --------------------------------------
         */

        peer.onicecandidate =
            function (event) {

                if (event.candidate) {

                    console.log(
                        "ICE candidate generated"
                    );

                } else {

                    console.log(
                        "ICE gathering completed"
                    );
                }
            };


        /*
         * --------------------------------------
         * ICE GATHERING STATE
         * --------------------------------------
         */

        peer.onicegatheringstatechange =
            function () {

                console.log(
                    "ICE gathering:",
                    peer.iceGatheringState
                );

            };


        /*
         * --------------------------------------
         * ICE CONNECTION STATE
         *
         * This is the important part.
         * --------------------------------------
         */

        peer.oniceconnectionstatechange =
            function () {

                var state =
                    peer.iceConnectionState;


                console.log(
                    "ICE connection state:",
                    state
                );


                if (state === "new") {

                    setStatus(
                        "offline",
                        "Ready",
                        "Waiting for connection"
                    );
                }


                if (state === "checking") {

                    setStatus(
                        "offline",
                        "Connecting...",
                        "Checking network connection"
                    );
                }


                if (
                    state === "connected" ||
                    state === "completed"
                ) {

                    connected = true;

                    setStatus(
                        "online",
                        "Connected",
                        "Voice connection active"
                    );

                    audioStatus.textContent =
                        "Ready";
                }


                if (state === "disconnected") {

                    connected = false;

                    setStatus(
                        "offline",
                        "Disconnected",
                        "Connection temporarily lost"
                    );
                }


                if (state === "failed") {

                    connected = false;

                    setStatus(
                        "offline",
                        "Connection failed",
                        "WebRTC could not connect"
                    );
                }


                if (state === "closed") {

                    connected = false;

                    setStatus(
                        "offline",
                        "Connection closed",
                        "Call ended"
                    );
                }

            };


        /*
         * --------------------------------------
         * PEER CONNECTION STATE
         * --------------------------------------
         */

        peer.onconnectionstatechange =
            function () {

                /*
                 * Some older browsers may not
                 * expose connectionState.
                 */

                if (
                    typeof peer.connectionState ===
                    "undefined"
                ) {
                    return;
                }


                console.log(
                    "Peer connection:",
                    peer.connectionState
                );


                if (
                    peer.connectionState ===
                    "connected"
                ) {

                    connected = true;

                    setStatus(
                        "online",
                        "Connected",
                        "Voice connection active"
                    );
                }


                if (
                    peer.connectionState ===
                    "failed"
                ) {

                    connected = false;

                    setStatus(
                        "offline",
                        "Connection failed",
                        "Peer connection failed"
                    );
                }
            };


        /*
         * --------------------------------------
         * REMOTE AUDIO
         * --------------------------------------
         */

        peer.ontrack =
            function (event) {

                console.log(
                    "Remote audio received"
                );


                if (
                    event.streams &&
                    event.streams.length > 0
                ) {

                    remoteAudio.srcObject =
                        event.streams[0];


                    /*
                     * Try to start audio.
                     */

                    var playPromise =
                        remoteAudio.play();


                    if (playPromise) {

                        playPromise.catch(
                            function (error) {

                                console.log(
                                    "Audio autoplay blocked",
                                    error
                                );

                            }
                        );
                    }


                    audioStatus.textContent =
                        "Receiving";
                }

            };


        /*
         * --------------------------------------
         * NEGOTIATION
         * --------------------------------------
         */

        peer.onnegotiationneeded =
            function () {

                console.log(
                    "Negotiation needed"
                );

            };


        console.log(
            "Peer created"
        );
    }


    /*
     * ==========================================
     * MICROPHONE
     * ==========================================
     */

    function getMicrophone() {

        if (localStream) {

            return Promise.resolve(
                localStream
            );
        }


        /*
         * Modern API
         */

        if (
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia
        ) {

            return navigator.mediaDevices
                .getUserMedia({

                    audio: true,

                    video: false

                })
                .then(function (stream) {

                    setupLocalStream(
                        stream
                    );

                    return stream;

                });

        }


        /*
         * Older browser API
         */

        var oldGetUserMedia =
            navigator.getUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.webkitGetUserMedia;


        if (!oldGetUserMedia) {

            setStatus(
                "offline",
                "Microphone unavailable",
                "getUserMedia is not supported"
            );

            return Promise.reject(
                new Error(
                    "getUserMedia unavailable"
                )
            );
        }


        return new Promise(
            function (resolve, reject) {

                oldGetUserMedia.call(
                    navigator,
                    {
                        audio: true,
                        video: false
                    },

                    function (stream) {

                        setupLocalStream(
                            stream
                        );

                        resolve(stream);
                    },

                    function (error) {

                        reject(error);
                    }
                );

            }
        );
    }


    /*
     * ==========================================
     * SETUP LOCAL AUDIO
     * ==========================================
     */

    function setupLocalStream(stream) {

        localStream =
            stream;


        console.log(
            "Microphone permission granted"
        );


        var tracks =
            stream.getAudioTracks();


        for (
            var i = 0;
            i < tracks.length;
            i++
        ) {

            /*
             * Start muted.
             *
             * Audio is enabled only
             * while HOLD TO TALK is pressed.
             */

            tracks[i].enabled =
                false;


            peer.addTrack(
                tracks[i],
                stream
            );
        }


        audioStatus.textContent =
            "Ready";
    }


    /*
     * ==========================================
     * WAIT FOR ICE GATHERING
     * ==========================================
     */

    function waitForICE() {

        return new Promise(
            function (resolve) {

                /*
                 * Already complete
                 */

                if (
                    peer.iceGatheringState ===
                    "complete"
                ) {

                    resolve();

                    return;
                }


                /*
                 * Wait for completion
                 */

                var finished =
                    false;


                function finish() {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    peer.removeEventListener(
                        "icegatheringstatechange",
                        check
                    );

                    resolve();
                }


                function check() {

                    console.log(
                        "ICE gathering:",
                        peer.iceGatheringState
                    );


                    if (
                        peer.iceGatheringState ===
                        "complete"
                    ) {

                        finish();
                    }
                }


                peer.addEventListener(
                    "icegatheringstatechange",
                    check
                );


                /*
                 * Safety timeout.
                 *
                 * Do not wait forever.
                 */

                setTimeout(
                    finish,
                    8000
                );

            }
        );
    }


    /*
     * ==========================================
     * CREATE OFFER
     * ==========================================
     */

    document
        .getElementById("createOffer")
        .onclick =
        function () {

            isCaller = true;


            setStatus(
                "offline",
                "Preparing...",
                "Requesting microphone"
            );


            createPeer();


            getMicrophone()

                .then(
                    function () {

                        return peer
                            .createOffer({
                                offerToReceiveAudio:
                                    true
                            });

                    }
                )

                .then(
                    function (offer) {

                        console.log(
                            "Offer created"
                        );


                        return peer
                            .setLocalDescription(
                                offer
                            );

                    }
                )

                .then(
                    function () {

                        setStatus(
                            "offline",
                            "Preparing connection",
                            "Collecting network information"
                        );


                        return waitForICE();

                    }
                )

                .then(
                    function () {

                        var offerData = {

                            type: "offer",

                            sdp:
                                peer
                                .localDescription
                                .sdp

                        };


                        connectionCode.value =
                            JSON.stringify(
                                offerData
                            );


                        codePanel.className =
                            "code-panel";


                        setStatus(
                            "offline",
                            "Offer ready",
                            "Send the code to the other phone"
                        );


                        console.log(
                            "OFFER:",
                            offerData
                        );

                    }
                )

                .catch(
                    function (error) {

                        console.error(
                            "Offer error:",
                            error
                        );


                        setStatus(
                            "offline",
                            "Connection error",
                            error.message ||
                            "Could not create offer"
                        );

                    }
                );
        };


    /*
     * ==========================================
     * ENTER REMOTE CODE
     * ==========================================
     */

    document
        .getElementById("acceptOffer")
        .onclick =
        function () {

            var code =
                window.prompt(
                    "Paste Offer or Answer code:"
                );


            if (!code) {
                return;
            }


            try {

                var data =
                    JSON.parse(code);


                if (
                    data.type === "offer"
                ) {

                    acceptOffer(
                        data
                    );

                } else if (
                    data.type === "answer"
                ) {

                    acceptAnswer(
                        data
                    );

                } else {

                    alert(
                        "Invalid connection code"
                    );
                }

            }
            catch (error) {

                console.error(
                    error
                );


                alert(
                    "Invalid JSON connection code"
                );
            }
        };


    /*
     * ==========================================
     * ACCEPT OFFER
     * ==========================================
     */

    function acceptOffer(data) {

        isCaller = false;


        setStatus(
            "offline",
            "Preparing...",
            "Receiving connection request"
        );


        createPeer();


        getMicrophone()

            .then(
                function () {

                    console.log(
                        "Setting remote OFFER"
                    );


                    return peer
                        .setRemoteDescription({

                            type: "offer",

                            sdp: data.sdp

                        });

                }
            )

            .then(
                function () {

                    remoteDescriptionSet =
                        true;


                    console.log(
                        "Remote offer set"
                    );


                    return peer
                        .createAnswer({
                            offerToReceiveAudio:
                                true
                        });

                }
            )

            .then(
                function (answer) {

                    console.log(
                        "Answer created"
                    );


                    return peer
                        .setLocalDescription(
                            answer
                        );

                }
            )

            .then(
                function () {

                    setStatus(
                        "offline",
                        "Preparing answer",
                        "Collecting network information"
                    );


                    return waitForICE();

                }
            )

            .then(
                function () {

                    var answerData = {

                        type: "answer",

                        sdp:
                            peer
                            .localDescription
                            .sdp

                    };


                    connectionCode.value =
                        JSON.stringify(
                            answerData
                        );


                    codePanel.className =
                        "code-panel";


                    setStatus(
                        "offline",
                        "Answer ready",
                        "Send this code back to caller"
                    );


                    console.log(
                        "ANSWER:",
                        answerData
                    );

                }
            )

            .catch(
                function (error) {

                    console.error(
                        "Answer error:",
                        error
                    );


                    setStatus(
                        "offline",
                        "Connection error",
                        error.message ||
                        "Could not create answer"
                    );

                }
            );
    }


    /*
     * ==========================================
     * ACCEPT ANSWER
     * ==========================================
     */

    function acceptAnswer(data) {

        if (!peer) {

            alert(
                "Create the connection first."
            );

            return;
        }


        if (!isCaller) {

            alert(
                "This device did not create the offer."
            );

            return;
        }


        setStatus(
            "offline",
            "Connecting...",
            "Applying remote answer"
        );


        peer
            .setRemoteDescription({

                type: "answer",

                sdp: data.sdp

            })

            .then(
                function () {

                    remoteDescriptionSet =
                        true;


                    console.log(
                        "Remote answer applied"
                    );


                    setStatus(
                        "offline",
                        "Connecting...",
                        "Waiting for WebRTC connection"
                    );

                }
            )

            .catch(
                function (error) {

                    console.error(
                        "Answer error:",
                        error
                    );


                    setStatus(
                        "offline",
                        "Invalid answer",
                        error.message
                    );

                }
            );
    }


    /*
     * ==========================================
     * PUSH TO TALK
     * ==========================================
     */

    function startTalking() {

        if (!localStream) {

            setStatus(
                "offline",
                "Microphone not ready",
                "Create a connection first"
            );

            return;
        }


        if (!connected) {

            setStatus(
                "offline",
                "Not connected",
                "Wait until connection is established"
            );

            return;
        }


        var tracks =
            localStream.getAudioTracks();


        for (
            var i = 0;
            i < tracks.length;
            i++
        ) {

            tracks[i].enabled =
                true;
        }


        setTalking(true);


        console.log(
            "TALK START"
        );
    }


    function stopTalking() {

        if (!localStream) {
            return;
        }


        var tracks =
            localStream.getAudioTracks();


        for (
            var i = 0;
            i < tracks.length;
            i++
        ) {

            tracks[i].enabled =
                false;
        }


        setTalking(false);


        console.log(
            "TALK STOP"
        );
    }


    /*
     * ==========================================
     * TOUCH CONTROLS
     * ==========================================
     */

    talkButton.addEventListener(
        "touchstart",
        function (event) {

            event.preventDefault();

            startTalking();

        },
        false
    );


    talkButton.addEventListener(
        "touchend",
        function (event) {

            event.preventDefault();

            stopTalking();

        },
        false
    );


    talkButton.addEventListener(
        "touchcancel",
        function (event) {

            event.preventDefault();

            stopTalking();

        },
        false
    );


    /*
     * ==========================================
     * MOUSE CONTROLS
     * ==========================================
     */

    talkButton.addEventListener(
        "mousedown",
        function () {

            startTalking();

        },
        false
    );


    talkButton.addEventListener(
        "mouseup",
        function () {

            stopTalking();

        },
        false
    );


    talkButton.addEventListener(
        "mouseleave",
        function () {

            stopTalking();

        },
        false
    );


    /*
     * ==========================================
     * KEYBOARD / KAIOS KEYPAD
     * ==========================================
     *
     * Enter / OK = Push to Talk
     */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.keyCode === 13
            ) {

                event.preventDefault();

                startTalking();
            }

        },
        false
    );


    document.addEventListener(
        "keyup",
        function (event) {

            if (
                event.key === "Enter" ||
                event.keyCode === 13
            ) {

                event.preventDefault();

                stopTalking();
            }

        },
        false
    );


    /*
     * ==========================================
     * COPY CONNECTION CODE
     * ==========================================
     */

    document
        .getElementById("copyCode")
        .onclick =
        function () {

            connectionCode.select();


            try {

                document.execCommand(
                    "copy"
                );


                alert(
                    "Code copied"
                );

            }
            catch (error) {

                alert(
                    "Copy failed. Select the code manually."
                );
            }
        };


    /*
     * ==========================================
     * CLOSE CODE PANEL
     * ==========================================
     */

    document
        .getElementById("closeCode")
        .onclick =
        function () {

            codePanel.className =
                "code-panel hidden";
        };


    /*
     * ==========================================
     * INITIAL STATE
     * ==========================================
     */

    setStatus(
        "offline",
        "Not connected",
        "Ready to connect"
    );


    console.log(
        "WiFi Walkie initialized"
    );


})();
