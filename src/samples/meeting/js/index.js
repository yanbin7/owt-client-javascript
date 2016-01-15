//var serverAddress = 'http://180.153.223.233:3001/';
//var serverAddress = 'http://10.239.33.28:3001/';
var securedServerAddress = 'https://webrtc.sh.intel.com:3004/';
var unsecuredServerAddress = 'http://webrtc.sh.intel.com:3001/';
var serverAddress = unsecuredServerAddress;
var isSecuredConnection = false;
var nodeAddress = 'http://webrtc.sh.intel.com:1235';
var localStream = null;
var localScreen = null;
var room = null;
var roomId = null;
var serviceKey = null;
var name = 'Anonymous';
var localId = generateId();
var users = [];
var progressTimeOut = null;
var smallRadius = 60;
var largeRadius = 120;
var isMouseDown = false;
var mouseX = null;
var mouseY = null;
var MODES = {
    GALAXY: 'galaxy',
    MONITOR: 'monitor',
    LECTURE: 'lecture'
};
var mode = MODES.GALAXY;
var SUBSCRIBETYPES = {
    FORWARD: 'forward',
    MIX: 'mix'
};
var subscribeType = SUBSCRIBETYPES.FORWARD;
var isScreenSharing = false;
var isLocalScreenSharing = false;
var remoteScreen = null;
var remoteScreenName = null;
var curTime = 0;
var totalTime = 0;
var isMobile = false;
var streamObj = {};
var streamIndices = {};
var hasMixed = false;
var isSmall = false;
var singleMute=true;
var isPauseAudio=true;
var isPauseVideo=false;

function login() {
    setTimeout(function() {
        var inputName = $('#login-input').val();
        if (inputName !== '') {
            name = inputName;
            $('#login-panel').addClass('pulse');

            $('#login-panel').hide();
            $('#container').show();
            initWoogeen();
        }
    }, 400);
    if (isMobile && typeof document.body.webkitRequestFullScreen === 'function') {
        document.body.webkitRequestFullScreen();
    }
}

function setLoginHeight(height){
    $('#login-panel').height(height);
}

function toggleLoginSetting() {
    $('#default-login').slideToggle();
    $('#setting-login').slideToggle();
}

function loginDisableVideo() {
    $('#login-resolution').slideUp();
}

function loginEnableVideo() {
    $('#login-resolution').slideDown();
}

function exit() {
    if (confirm('Are you sure to exit?')) {
        // window.open('', '_self').close();
        userExit();
    }
}

function userExit(){
        room.leave();
        users=[];
        $("#video-panel div[id^=client-]").remove();
        $("#localScreen").remove();
        $("#screen").remove();
        $("#container").hide();
        $("#login-panel").removeClass("pulse").show();
        $("#user-list").html('');
        localStream.close();
        localStream = undefined;
        isPauseAudio=true;
        singleMute=true;
}

function stopAllStream() {
    for (var temp in streamObj) {
        streamObj[temp].close();
    }
}

var isVcLoaded = false;

function startVc() {
    if (isVcLoaded) {
        $('#vc-dialog').show();
    } else {
        // vc events
        $('#vc-enable').change(function() {
            if ($(this).prop('checked')) {
                $('#vc-mode').removeAttr('disabled');
            } else {
                $('#vc-mode').attr('disabled', true).prop('checked', false);
            }
        });

        $.ajax({
            type: 'get',
            dataType: 'jsonp',
            crossDomain: true,
            url: nodeAddress,
            success: function(data) {
                // get images and videos from nodejs server
                data = JSON.parse(data);
                var videos = data.videos;
                for (var i in videos) {
                    $('#vc-video-panel').append('<a class="vc-selectable vc-video"' + ' href="javascript:;"' + '><video src="' + nodeAddress + '/videos/' + videos[i] + '" autoplay muted loop></video></a>');
                }
                var images = data.images;
                for (var i in images) {
                    $('#vc-image-panel').append('<a class="vc-selectable vc-image"' + ' href="javascript:;"' + '><img src="' + nodeAddress + '/images/' + images[i] + '" /></a>');
                }

                for (var i = 0; i < 3; ++i) {
                    $('#vc-position-panel').append('<a href="javascript:;" ' + 'class="vc-selectable vc-position"><img ' + 'src="img/avatar_p' + (i + 1) + '.png" /></a>');
                }

                // default select first image and video
                $('.vc-image').first().addClass('selected');
                $('.vc-position').first().addClass('selected');

                // handle click events
                $('.vc-selectable').click(function() {
                    if ($(this).hasClass('vc-video') || $(this).hasClass('vc-image')) {
                        $('.vc-video,.vc-image').removeClass('selected');
                    } else if ($(this).hasClass('vc-position')) {
                        $('.vc-position').removeClass('selected');
                    }
                    $(this).addClass('selected');
                })

                isVcLoaded = true;
                $('#vc-dialog').show();
            },
            error: function(e) {
                alert('Fail to load virtual camera images and videos!');
                console.error(e);
            }
        });
    }
}

function sendVc() {
    var cx = 1920;
    var cy = 1080;

    // x and y value from position panel
    var $pos = $('#vc-position-panel').children();
    if ($($pos[0]).hasClass('selected')) {
        // center aligned
        var x = 640;
        var y = 720;
    } else if ($($pos[1]).hasClass('selected')) {
        // left aligned
        var x = 0;
        var y = 720;
    } else if ($($pos[2]).hasClass('selected')) {
        // right aligned
        var x = 1280;
        var y = 720;
    }

    // check if image or video selected
    var $selected = $('#vc-image-panel,#vc-video-panel').children('.selected');
    var isImgSelected = $selected.hasClass('vc-image');

    // file path
    var path = $selected.children().attr('src');
    path = path.slice(path.lastIndexOf('/') + 1);

    $.ajax({
        url: nodeAddress + '/upload',
        crossDomain: true,
        dataType: 'jsonp',
        data: {
            image: {
                x: 0,
                y: 0,
                cx: 1920,
                cy: 1080,
                z: 5,
                enable: isImgSelected ? 1 : 0,
                file: 'images/' + path
            },
            video: {
                x: 0,
                y: 0,
                cx: 1920,
                cy: 1080,
                z: 5,
                enable: isImgSelected ? 0 : 1,
                file: 'videos/' + path
            },
            seg: {
                x: x,
                y: y,
                cx: 640,
                cy: 360,
                z: 5,
                enable: $('#vc-enable').prop('checked') ? 1 : 0,
                mode: $('#vc-mode').prop('checked') ? 1 : 0
            }
        },
        success: function() {
            alert('Successfully configured!');
            $('#vc-dialog').hide();
        },
        error: function(xhr, status, error) {
            alert('Error when apply!');
            console.error(xhr, status, error);
        }
    });
}

function initWoogeen() {
    L.Logger.setLogLevel(L.Logger.ERROR);

    if ($('#subscribe-type').val() === 'mixed') {
        subscribeType = SUBSCRIBETYPES.MIX;
        mode = MODES.LECTURE;
        $("#monitor-btn").addClass("disabled");
        $("#galaxy-btn").addClass("disabled");
    } else {
        subscribeType = SUBSCRIBETYPES.FORWARD;
        mode = MODES.GALAXY;
        $("#monitor-btn").removeClass("disabled");
        $("#galaxy-btn").removeClass("disabled");
    }

    // users.push({
    //     name: name,
    //     id: localId
    // });
   // $('#profile').text(name);
    $('#userNameDisplay').text("Logged in as: "+name);
    hasMixed = !(subscribeType === SUBSCRIBETYPES.MIX);

    var bandWidth = 100,
        videoSize = "sif";
    if ($('#login-480').hasClass('selected')) {
        bandWidth = 500;
        videoSize = "vga";
    } else if ($('#login-720').hasClass('selected')) {
        bandWidth = 1000;
        videoSize = "hd720p";
    }

    var setStream = {};
    if ($("#login-audio-video").hasClass("selected")) {
        setStream = {
            resolution: videoSize
        }
    } else {
        setStream = $("#login-audio-video").hasClass("selected")
    }
    var isIce = $(".checkbox")[0].checked;

    function createLocal() {
        if (hasMixed) {
            Woogeen.LocalStream.create({
                video: setStream,
                audio: true,  //set default muted
                data: true,
                attributes: {
                    id: localId,
                    name: name
                }
            }, function(err, stream) {
                if (err) {
                    return L.Logger.error('create LocalStream failed:', err);
                }
                localStream = stream;
                sendIm('Connected to the room.', 'System');
                $('#text-send,#send-btn').show();

                room.publish(localStream, {
                    maxVideoBW: bandWidth
                }, function(st) {
                    L.Logger.info('stream published:', st.id());
                    console.log("localStream subscribed");
                    addVideo(localStream, true);
                    streamObj[localStream.id()] = localStream;
                    room.pauseAudio(localStream,"","");
                }, function(err) {
                    L.Logger.error('publish failed:', err);
                });

            });
        } else {
            setTimeout(createLocal, 500);
        }
    }

    createToken(name, 'presenter', serviceKey, function(status, response) {
        if (status !== 200) {
            L.Logger.error('createToken failed:', response, status);
            sendIm('Failed to connect to the server, please reload the page to ' + 'try again.', 'System');
            return;
        }
        if (!room) {
            room = Woogeen.ConferenceClient.create({
                token: response,
                secure: isSecuredConnection
            });
            addRoomEventListener();
        }

        if (isIce) {
            room.setIceServers([{
                url: "stun:180.153.223.235"
            }, {
                url: "turn:180.153.223.235:4478?transport=udp",
                credential: "master",
                username: "woogeen"
            }, {
                url: "turn:180.153.223.235:443?transport=udp",
                credential: "master",
                username: "woogeen"
            }, {
                url: "turn:180.153.223.235:4478?transport=tcp",
                credential: "master",
                username: "woogeen"
            }, {
                url: "turn:180.153.223.235:443?transport=udp",
                credential: "master",
                username: "woogeen"
            }]);
        }

        room.join(response, function(resp) {
            var streams = resp.streams;
            var getLoginUsers = resp.users;
            //for(var i in users){console.log("join a user:"+users[i].name);}
            console.log(resp);
            getLoginUsers.map(function(user) {
                 users.push({
                        id: user.id,
                        name: user.name
                    });
            });
            loadUserList();
            streams.map(function(stream) {
                if (stream.isMixed && stream.isMixed()) {
                    console.log("Mix stream id: "+stream.id());
                }
                L.Logger.info('stream in conference:', stream.id());
                streamObj[stream.id()] = stream;

                if (!stream.isMixed() && !stream.isScreen()) {
                    var attr = stream.attributes();
                    users.push({
                        id: stream.id(),
                        name: attr.name
                    });
                    sendIm(attr["name"] + ' has joined the room.', 'System');
                }
                if (subscribeType === SUBSCRIBETYPES.FORWARD && stream.isMixed()) {
                    return;
                } else if (subscribeType === SUBSCRIBETYPES.MIX && !stream.isMixed() && !stream.isScreen()) {
                    return;
                }
                L.Logger.info('subscribing:', stream.id());
                room.subscribe(stream, function() {
                    L.Logger.info('subscribed:', stream.id());
                    addVideo(stream, false);
                    console.log("subscribe");
                    streamObj[stream.id()] = stream;
                }, function(err) {
                    L.Logger.error(stream.id(), 'subscribe failed1:', err);
                });
            });
            createLocal();
        }, function(err) {
            L.Logger.error('server connection failed:', err);
        });
    });
}

function loadUserList(){
        for(var u in users){
           // addUserListItem(users[u],isMute(users[u].id));
           addUserListItem(users[u],true);
        }
}

function addUserListItem(user,muted){
    var muteBtn='<img src="img/mute_white.png" class="muteShow" isMuted="true"/>';
    var unmuteBtn='<img src="img/unmute_white.png" class="muteShow" isMuted="false"/>';
    var muteStatus= muted ? muteBtn:unmuteBtn;
    $('#user-list').append('<li><div class="userID">'+user.id+'</div><img src="img/avatar.png" class="picture"/><div class="name">'+user.name+'</div>'+muteStatus+'</li>');
}

function chgMutePic(id,muted){
    var line=$('li:contains('+id+')').children('.muteShow');
    if(muted){
        line.attr('src',"img/mute_white.png");
        line.attr('isMuted',true);
    }
    else{
        line.attr('src',"img/unmute_white.png");
        line.attr('isMuted',false);
    }
}

function generateId() {
    return Math.floor((1 + Math.random()) * 0x10000 * 0x10000)
        .toString(16).substring(1);
}

function createToken(userName, role, room, callback) {
    var req = new XMLHttpRequest();
    var url = serverAddress + 'createToken/';
    var body = {
        username: userName,
        role: role,
        room: room
    };

    req.onreadystatechange = function() {
        if (req.readyState === 4 && typeof callback === 'function') {
            callback(req.status, req.responseText);
        }
    };

    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
}

function addRoomEventListener() {
    room.on('stream-added', function(streamEvent) {
        var stream = streamEvent.stream;
        console.log("stream added:", stream.id());
        streamObj = room.remoteStreams;
        if(stream.id() == localStream.id()) {
            room.startRecorder({videoStreamId:stream.id()}, function(info) {
                console.log("Record my stream succeed with info:", info);
            }, function(err) {
                condole.log("Record my stream fail with err:", err);
            });
        }

        if (subscribeType === SUBSCRIBETYPES.FORWARD && (stream.isMixed && stream.isMixed())) {
            return;
        } else if (subscribeType === SUBSCRIBETYPES.MIX && (!(stream.isMixed && stream.isMixed()) && !(stream.isScreen && stream.isScreen()))) {
            return;
        }
        if (localStream != null && stream.id() == localStream.id()) {
            return;
        }

        // append name to users for previously online clients
        var attr = stream.attributes() || [];
        var thatId = stream.id();
        var thatName = attr['name'] || 'Anonymous';
        var user = getUserFromId(thatId);
        if (stream.isMixed && stream.isMixed()) {
            thatName = "MIX Stream";
        } else if (stream.isScreen()) {
            thatName = "Screen Sharing";
        }
        if (stream.isScreen() && !isLocalScreenSharing) {
            remoteScreen = stream;
            thatName = streamObj[stream.from].attributes()["name"];
            remoteScreenName = thatName;
            shareScreenChanged(true, false);
            sendIm(thatName + ' is sharing screen now.', 'System');
        }

        // add video of non-local streams
        if (localId !== thatId) {
            room.on('message-received', function(event) {
                if (event.stream && event.msg && thatId !== null) {
                    var user = getUserFromId(thatId);
                    if (user && user['id']) {
                        sendIm(event.msg, user['id']);
                    }
                }
            });
            room.subscribe(stream, function() {
                L.Logger.info('subscribed:', stream.id());
                addVideo(stream);
                streamObj[stream.id()] = stream;
            }, function(err) {
                L.Logger.error(stream.id(), 'subscribe failed3:', err);
            });
        }
        streamObj = room.remoteStreams;
    });

    room.on('stream-removed', function(streamEvent) {
        console.log('stream-removed!');
        // Remove stream from DOM
        var stream = streamEvent.stream;
        var attr = stream.attributes() || [];
        var uid = stream.id();
        var user = getUserFromId(uid);
        if (stream.isScreen()) {
            delete streamObj["screen"];
        } else {
            delete streamObj[stream.from];
        }
        if (user !== null && user['htmlId'] !== undefined) {
            $('#client-' + user['htmlId']).addClass('pulse');

        } else if (stream.isScreen()) {
            if (isLocalScreenSharing) {
                $('#local-screen').addClass('pluse');
                localScreen.close();
                localScreen = null;
                sendIm('You have stopped screen sharing.');
            } else {
                $('#screen').addClass('pluse');
                // remoteScreen.close();
                remoteScreen = null;
                var user = streamObj[stream.from].attributes();
                sendIm(user['name'] + ' has stopped screen sharing.',
                    'System');
            }
        }
        setTimeout(function() {
            if (stream.isScreen()) {
                $('#local-screen').remove();
                $('#screen').remove();
                shareScreenChanged(false, false);
            } else {
                if (subscribeType === SUBSCRIBETYPES.FORWARD) {
                    $('#client-' + user['htmlId']).remove();
                }
            }
            if (subscribeType === SUBSCRIBETYPES.MIX) {
                changeMode(mode, $("div[isMix=true]"));
            } else {
                changeMode(mode);
            }
        }, 800);
    });

    room.on('stream-changed', function(e) {
        console.log('stream ' + e.stream.id() + ' has changed');
    });

    room.on('user-joined', function(e) {
        if (e.user.name !== 'user' && getUserFromId(e.user.name) === null) {
            // new user
            users.push({
                id: e.user.id,
                name: e.user.name
            });
            sendIm(e.user.name + ' has joined the room.', 'System');
            addUserListItem(e.user,true);
            room.send({muteInitID:e.user.id},'all');
        }
    });

    room.on('user-left', function(e) {
        var user = getUserFromId(e.user.id);
        if (user !== null && user.name !== undefined) {
            sendIm(user['name'] + ' has left the room.', 'System');
            deleteUser(e.user.id);
             $('li').remove( ":contains("+user['id']+")");
        } else {
            sendIm('Anonymous has left the room.', 'System');
        }
    });

     room.onMessage(function(event) {
        //console.log(event.msg.data.myMuted+"ggg");
        var user = getUserFromId(event.msg.from);
        if (!user) return;

        if(event.msg.data.muteInitID!=undefined){
            console.log("init status "+event.msg.data.muteInitID);
            room.send({myMuted:isPauseAudio},event.msg.data.muteInitID);
        //chgMutePic(event.msg.from,event.msg.data.muteInit);
        }
        if(event.msg.data.myMuted!=undefined){
            console.log("get status "+event.msg.data.myMuted);
            chgMutePic(event.msg.from,event.msg.data.myMuted);
        }
        if(event.msg.data.muted!=undefined){
            chgMutePic(event.msg.from,event.msg.data.muted);
        }
        if(localStream!=null && localStream.id()!=null && event.msg.data.toID==localStream.id()){
            pauseAudio();
            //isPauseAudio ? $("#msgText").text(event.msg.data.fromName+" mutes you."):$("#msgText").text(event.msg.data.fromName+" unmutes you.");
            !isPauseAudio ? $("#msgText").text("You are muted."):$("#msgText").text("You are unmuted.");
            $(".msgBox").show();
            $(".msgBox").fadeOut(6000);
        }
        var time = new Date();
        var hour = time.getHours();
        hour = hour > 9 ? hour.toString() : '0' + hour.toString();
        var mini = time.getMinutes();
        mini = mini > 9 ? mini.toString() : '0' + mini.toString();
        var sec = time.getSeconds();
        sec = sec > 9 ? sec.toString() : '0' + sec.toString();
        var timeStr = hour + ':' + mini + ':' + sec;
        var color = getColor(user.name);
        $('<p class="' + color + '">').html(timeStr + ' ' + user.name + '<br />')
            .append(document.createTextNode(event.msg.data)).appendTo('#text-content');
    });
}

function shareScreen() {
    if ($('#screen-btn').hasClass('disabled')) {
        return;
    }
    sendIm('You are sharing screen now.');
    $('#video-panel .largest').removeClass("largest");
    $('#video-panel').append('<div id="local-screen" class="client clt-0 largest"' +
        '>Screen Sharing</div>').addClass('screen');
    changeMode(MODES.LECTURE, $('#local-screen'));
    room.shareScreen({
        resolution: "hd1080p",
        frameRate: [10, 10]
    }, function(stream) {
        console.log("share screen Stream id: "+stream.id());
        // stream.show('local-screen');
        localScreen = stream;
        changeMode(MODES.LECTURE, $('#local-screen'));
        localScreen.mediaStream.addEventListener('ended', function(e) {
            changeMode(MODES.LECTURE);
            console.log('unpublish');
            setTimeout(function() {
                $('#local-screen').remove();
                $('#screen').remove();
                shareScreenChanged(false, false);
                if (subscribeType === SUBSCRIBETYPES.MIX) {
                    changeMode(mode, $("div[isMix=true]"));
                } else {
                    changeMode(mode);
                }
            }, 800);
        });
    }, function(err) {
        L.Logger.error('share screen failed:', err);
        changeMode(MODES.LECTURE);
        $('#local-screen').remove();
        $('#screen').remove();
        shareScreenChanged(false, false);
        if (window.location.protocol === "https:" && subscribeType === SUBSCRIBETYPES.MIX) {
            changeMode(mode, $("div[isMix=true]"));
        }
    });

    shareScreenChanged(true, true);
}

// update screen btn when sharing
function shareScreenChanged(ifToShare, ifToLocalShare) {
    isScreenSharing = ifToShare;
    isLocalScreenSharing = ifToLocalShare;
    $('#screen-btn').removeClass('disabled selected');
    if (ifToShare) {
        if (ifToLocalShare) {
            $('#screen-btn').addClass('selected disabled');
        } else {
            $('#screen-btn').addClass('disabled');
        }
        $('#galaxy-btn,#monitor-btn').addClass('disabled');
    } else {
        if (subscribeType === SUBSCRIBETYPES.FORWARD) {
            $('#galaxy-btn,#monitor-btn').removeClass('disabled');
        }
        $('#video-panel').removeClass('screen');
    }
}

// decide next size according to previous sizes and window w and h
function getNextSize() {
    var lSum = $('#video-panel .small').length * smallRadius * smallRadius * 5;
    var sSum = $('#video-panel .large').length * largeRadius * largeRadius * 10;
    var largeP = 1 / ((lSum + sSum) / $('#video-panel').width() / $('#video-panel').height() + 1) - 0.5;
    if (Math.random() < largeP) {
        return 'large';
    } else {
        return 'small';
    }
}

function addVideo(stream, isLocal) {
    // compute next html id
    var id = $('#video-panel').children('.client').length;
    while ($('#client-' + id).length > 0) {
        ++id;
    }
    var attr = stream.attributes();
    var uid = stream.id();
    if (stream == localStream) {
        console.log("localStream addVideo1");
    }
    if (stream instanceof Woogeen.RemoteStream && stream.isMixed()) {
        hasMixed = true;
    }

    // check if is screen sharing
    if (stream.isScreen()) {
        $('#video-panel').addClass('screen')
            .append('<div class="client" id="screen"></div>');
        stream.show('screen');
        $('#screen').addClass('clt-' + getColorId(uid))
            .children().children('div').remove();
        $('#video-panel .largest').removeClass("largest");
        $('#screen').addClass("largest");
        $('#screen').append('<div class="ctrl"><a href="#" class="ctrl-btn enlarge"></a><a href="#" class="ctrl-btn ' + 'fullscreen"></a></div>').append('<div class="ctrl-name">' + 'Screen Sharing from ' + streamObj[stream.from].attributes()['name'] + '</div>');
        $('#local-screen').remove();
        changeMode(MODES.LECTURE, !isLocalScreenSharing);
        streamObj["screen"] = stream;

    } else {
        // append to global users
        var thisUser = getUserFromId(uid) || {};
        var htmlClass = isLocal ? 0 : (id - 1) % 5 + 1;
        thisUser.htmlId = id;
        thisUser.htmlClass = thisUser.htmlClass || htmlClass;
        thisUser.stream = stream;
        thisUser.id = uid;

        // append new video to video panel
        var size = getNextSize();
        $('#video-panel').append('<div class="' + size + ' clt-' + htmlClass + ' client pulse" ' + 'id="client-' + id + '"></div>');
        if (isLocal) {
            var opt = {
                muted: 'muted'
            };
            $('#client-' + id).append('<div class="self-arrow"></div>');
        }
        stream.show('client-' + id, opt);
        var hasLeft = mode === MODES.GALAXY,
            element = $("#client-" + id),
            width = element.width(),
            height = element.height();
        element.find("video").css({
            width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) + "px)" : "100%",
            height: "100%",
            top: "0px",
            left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
        });
        var player = $('#client-' + id).children(':not(.self-arrow)');
        player.attr('id', 'player-' + id).addClass('player')
            .css('background-color', 'inherit');
        player.children('div').remove();
        player.children('video').attr('id', 'video-' + id).addClass('video');

        // add avatar for no video users
        if (stream.video === false) {
            player.parent().addClass('novideo');
            player.append('<img src="img/avatar.png" class="img-novideo" />');
        }

        // control buttons and user name panel
        var resize = size === 'large' ? 'shrink' : 'enlarge';
        var attr = stream.attributes() || [];
        var name = attr['name'] ? attr['name'] : 'Anonymous';
        var muteBtn ="";

        if (stream.isMixed && stream.isMixed()) {
            name = "MIX Stream";
            $("#client-" + id).attr("isMix", "true");
            muteBtn = '<a href="#" class="ctrl-btn unmute"></a>';
        }
        streamIndices['client-' + id] = stream.id();

        $('#client-' + id).append('<div class="ctrl">' + '<a href="#" class="ctrl-btn ' + resize + '"></a>' + '<a href="#" class="ctrl-btn fullscreen"></a>' + muteBtn + '</div>')
            .append('<div class="ctrl-name">' + name + '</div>').append("<div class='noCamera'></div>");
        relocate($('#client-' + id));
        changeMode(mode);
    }

    function mouseout(e) {
            isMouseDown = false;
            mouseX = null;
            mouseY = null;
            $(this).css('transition', '0.5s');
        }
        // no animation when dragging
    $('.client').mousedown(function(e) {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
            $(this).css('transition', '0s');
        }).mouseup(mouseout).mouseout(mouseout)
        .mousemove(function(e) {
            e.preventDefault();
            if (!isMouseDown || mouseX === null || mouseY === null || mode !== MODES.GALAXY) {
                return;
            }
            // update position to prevent from moving outside of video-panel
            var left = parseInt($(this).css('left')) + e.clientX - mouseX;
            var border = parseInt($(this).css('border-width')) * 2;
            var maxLeft = $('#video-panel').width() - $(this).width() - border;
            if (left < 0) {
                left = 0;
            } else if (left > maxLeft) {
                left = maxLeft;
            }
            $(this).css('left', left);

            var top = parseInt($(this).css('top')) + e.clientY - mouseY;
            var maxTop = $('#video-panel').height() - $(this).height() - border;
            if (top < 0) {
                top = 0;
            } else if (top > maxTop) {
                top = maxTop;
            }
            $(this).css('top', top);

            // update data for later calculation position
            $(this).data({
                left: left,
                top: top
            });
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

    // stop pulse when animation completes
    setTimeout(function() {
        $('#client-' + id).removeClass('pulse');
    }, 800);
}

function toggleIm(isToShow) {
    if (isToShow || $('#text-panel').is(":visible")) {
        $('#video-panel').css('left', 0);
    } else {
        $('#video-panel').css('left', $('#text-panel').width());
    }
    $('#text-panel').toggle();
    if ($('#im-btn').hasClass('selected')) {
        $('#im-btn').removeClass('selected');
    } else {
        $('#im-btn').addClass('selected');
    }
    changeMode(mode);
}

function relocate(element) {
    var max_loop = 1000;
    var margin = 20;
    for (var loop = 0; loop < max_loop; ++loop) {
        var r = element.hasClass('large') ? largeRadius : smallRadius;
        var w = $('#video-panel').width() - 2 * r - 2 * margin;
        var y = $('#video-panel').height() - 2 * r - 2 * margin;
        var x = Math.ceil(Math.random() * w + r + margin);
        var y = Math.ceil(Math.random() * y + r + margin);
        var others = $('.client');
        var len = others.length;
        var isFeasible = x + r < $('#video-panel').width() && y + r < $('#video-panel').height();
        for (var i = 0; i < len && isFeasible; ++i) {
            var o_r = $(others[i]).hasClass('large') ? largeRadius : smallRadius;
            var o_x = parseInt($(others[i]).data('left')) + o_r;
            var o_y = parseInt($(others[i]).data('top')) + o_r;
            if ((o_x - x) * (o_x - x) + (o_y - y) * (o_y - y) <
                (o_r + r + margin) * (o_r + r + margin)) {
                // conflict
                isFeasible = false;
                break;
            }
        }
        if (isFeasible) {
            var pos = {
                'left': x - r,
                'top': y - r
            };
            element.css(pos).data('left', x - r).data('top', y - r);
            return true;
        }
    }
    // no solution
    var pos = {
        'left': x - r,
        'top': y - r
    };
    element.css(pos).data('left', x - r).data('top', y - r);
    return false;
}

function sendIm(msg, sender) {
    var time = new Date();
    var hour = time.getHours();
    hour = hour > 9 ? hour.toString() : '0' + hour.toString();
    var mini = time.getMinutes();
    mini = mini > 9 ? mini.toString() : '0' + mini.toString();
    var sec = time.getSeconds();
    sec = sec > 9 ? sec.toString() : '0' + sec.toString();
    var timeStr = hour + ':' + mini + ':' + sec;
    if (msg === undefined) {
        // send local msg
        if ($('#text-send').val()) {
            msg = $('#text-send').val();
            $('#text-send').val('').height('18px');
            $('#text-content').css('bottom', '30px');
            sender = localId;
            // send to server
            if (users[0]) {
                room.send(msg, 'all', function(obj) {
                    L.Logger.info(users[0].name + "send message: " + obj);
                }, function(obj) {
                    L.Logger.error(users[0].name + "send failed: " + obj);
                });
            }
        } else {
            return;
        }
    }
    var color = getColor(sender);
    var user = getUserFromId(sender);
    var name = user ? user['name'] : 'System';
    $('<p class="' + color + '">').html(timeStr + ' ' + name + '<br />')
        .append(document.createTextNode(msg)).appendTo('#text-content');
    // scroll to bottom of text content
    $('#text-content').scrollTop($('#text-content').prop('scrollHeight'));
}

function updateProgress() {
    if (totalTime === 0) {
        return;
    }
    var width = parseInt(curTime / totalTime * 100);
    if (width >= 100) {
        clearTimeout(progressTimeOut);
        width = 100;
    } else {
        progressTimeOut = setTimeout(updateProgress, 1000);
    }
    curTime += 1;
    $('#progress').animate({
        'width': width + '%'
    }, 500);
}

function getColorId(id) {
    var user = getUserFromId(id);
    if (user) {
        return user.htmlClass;
    } else {
        // screen stream comes earlier than video stream
        var htmlClass = users.length % 5 + 1;
        users.push({
            name: name,
            htmlClass: htmlClass
        });
        return htmlClass;
    }
}

function getColor(id) {
    var user = getUserFromId(id);
    if (user) {
        return 'clr-clt-' + user.htmlClass;
    } else {
        return 'clr-sys';
    }
}

function getUserFromName(name) {
    for (var i = 0; i < users.length; ++i) {
        if (users[i] && users[i].name === name) {
            return users[i];
        }
    }
    return null;
}

function getUserFromId(id) {
    for (var i = 0; i < users.length; ++i) {
        if (users[i] && users[i].id === id) {
            return users[i];
        }
    }
    return null;
}

function deleteUser(id) {
    var index = 0;
    for (var i = 0; i < users.length; ++i) {
        if (users[i] && users[i].id === id) {
            index = i;
            break;
        }
    }
    users.splice(index, 1);
}

function toggleMute(id, toMute) {
    if (streamObj[streamIndices["client-" + id]]) {
        if (toMute) {
            streamObj[streamIndices["client-" + id]].disableAudio();
        } else {
            streamObj[streamIndices["client-" + id]].enableAudio();
        }
    }
}

function getColumns() {
    var col = 1;
    var cnt = $('#video-panel video').length;
    if (mode === MODES.LECTURE && !isScreenSharing) {
        --cnt;
    }
    if (cnt === 0) {
        return 0;
    }
    while (true) {
        var width = mode === MODES.MONITOR ?
            Math.floor($('#video-panel').width() / col) :
            Math.floor($('#text-panel').width() / col);
        var height = Math.floor(width * 3 / 4);
        var row = Math.floor($('#video-panel').height() / height);
        if (row * col >= cnt) {
            return col;
        }
        ++col;
    }
}

function changeMode(newMode, enlargeElement) {
    if (localStream) {
        console.log("localStream changeMode" + newMode);
    }
    switch (newMode) {
        case MODES.GALAXY:
            if ($('#galaxy-btn').hasClass('disabled')) {
                return;
            }
            mode = MODES.GALAXY;
            if (subscribeType === SUBSCRIBETYPES.FORWARD) {
                $('#galaxy-btn,#monitor-btn').removeClass('selected');
            } else {
                $('#galaxy-btn,#monitor-btn').addClass('disabled');
            }
            $('#galaxy-btn').addClass('selected');
            $('#video-panel').removeClass('monitor lecture')
                .addClass('galaxy');
            $.each($('.client'), function(key, value) {
                var d = smallRadius * 2;
                if ($(this).hasClass('large')) {
                    d = largeRadius * 2;
                    $(this).find('.enlarge')
                        .removeClass('enlarge').addClass('shrink');
                } else {
                    $(this).find('.shrink')
                        .removeClass('shrink').addClass('enlarge');
                }
                var left = parseInt($(this).data('left'));
                if (left < 0) {
                    left = 0;
                } else if (left > $('#video-panel').width() - d) {
                    left = $('#video-panel') - d;
                }
                var top = parseInt($(this).data('top'));
                if (top < 0) {
                    top = 0;
                } else if (top > $('#video-panel').height() - d) {
                    top = $('#video-panel').height() - d;
                }
                $(this).css({
                    left: left,
                    top: top,
                    width: d + 'px',
                    height: d + 'px'
                }).data({
                    left: left,
                    top: top
                });
            });
            setTimeout(function() {
                $('.client').css("position", "absolute");
            }, 500);
            break;

        case MODES.MONITOR:
            if ($('#monitor-btn').hasClass('disabled')) {
                return;
            }
            mode = MODES.MONITOR;
            if (subscribeType === SUBSCRIBETYPES.FORWARD) {
                $('#galaxy-btn,#monitor-btn').removeClass('selected');
            } else {
                $('#galaxy-btn,#monitor-btn').addClass('disabled');
            }
            $('#monitor-btn').addClass('selected');
            $('#video-panel').removeClass('galaxy lecture')
                .addClass('monitor');
            $('.shrink').removeClass('shrink').addClass('enlarge');
            updateMonitor();
            break;

        case MODES.LECTURE:
            if ($('#lecture-btn').hasClass('disabled')) {
                return;
            }
            mode = MODES.LECTURE;
            if (subscribeType === SUBSCRIBETYPES.FORWARD) {
                $('#galaxy-btn,#monitor-btn').removeClass('selected');
            } else {
                $('#galaxy-btn,#monitor-btn').addClass('disabled');
            }
            $('#lecture-btn').addClass('selected');
            $('#video-panel').removeClass('galaxy monitor')
                .addClass('lecture');
            $('.shrink').removeClass('shrink').addClass('enlarge');
            if (typeof enlargeElement !== 'boolean') {
                var largest = enlargeElement || ($('#screen').length > 0 ? $('#screen') : ($('.largest').length > 0 ? $('.largest').first() : ($('.large').length > 0 ? $('.large').first() : $('.client').first())));
                $('.client').removeClass('largest');
                largest.addClass('largest')
                    .find('.enlarge').removeClass('enlarge').addClass('shrink');
            }
            updateLecture(enlargeElement);
            break;

        default:
            console.error('Illegal mode name');
    }
    if (window.location.protocol !== "https:") {
        $("#screen-btn").addClass("disabled");
    }
    // update canvas size in all video panels
    $('.player').trigger('resizeVideo');
    setTimeout(resizeStream, 500, newMode);
}

function resizeStream(newMode) {
    if (!localStream) return;
    var hasLeft = newMode === MODES.GALAXY;
    for (var temp in streamObj) {
        var stream = streamObj[temp].id() === localStream.id() ? localStream : streamObj[temp],
            element = $("#" + stream.elementId),
            width = element.width(),
            height = element.height();
        element.find("video").css({
            width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) + "px)" : "100%",
            height: "100%",
            top: "0px",
            left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
        });
    }
}

function updateMonitor() {
    var col = getColumns();
    if (col > 0) {
        $('.client').css({
            width: Math.floor($('#video-panel').width() / col),
            height: Math.floor($('#video-panel').width() / col * 3 / 4),
            top: 'auto',
            left: 'auto',
            position: "relative",
            right: "auto"
        });
    }
}

function updateLecture(hasChange) {
    if (typeof hasChange !== 'boolean') hasChange = true;
    $('.largest').css({
        width: $('#video-panel').width() - $('#text-panel').width(),
        height: $('#video-panel').height(),
        position: "absolute"
    });

    var col = isScreenSharing ? 1 : getColumns();
    var tempTop = 0;
    var tempRight = 0;
    if (!hasChange) return;
    $('.client').not('.largest').each(function(i) {
        if (i === 0) {
            tempTop = 0;
        } else if (i % col === 0) {
            tempTop += Math.floor($('#text-panel').width() / col * 3 / 4);
            tempRight = 0;
        } else {
            tempRight += Math.floor($('#text-panel').width() / col);
        }

        // if (subscribeType === SUBSCRIBETYPES.FORWARD) {
        $(this).css("position", "absolute");
        // }

        $(this).css({
            width: Math.floor($('#text-panel').width() / col),
            height: Math.floor($('#text-panel').width() / col * 3 / 4),
            right: tempRight,
            top: tempTop,
            left: "auto"
        });
    });
}

function fullScreen(isToFullScreen, element) {
    if (isToFullScreen) {
        element.addClass('full-screen');
    } else {
        element.removeClass('full-screen');
    }
}

function exitFullScreen(ctrlElement) {
    if (ctrlElement.parent().hasClass('full-screen')) {
        fullScreen(false, ctrlElement.parent());
        //        ctrlElement.find(".shrink").removeClass('shrink').addClass('enlarge');;
        //        ctrlElement.find(".unmute").before('<a href="#" class="ctrl-btn fullscreen">');
        if ((ctrlElement.parent().hasClass('small') || mode !== MODES.GALAXY) && ctrlElement.parent().attr("id") == "screen") {
            ctrlElement.children('.shrink')
                .removeClass('shrink').addClass('fullscreen');
            if (isSmall) {
                ctrlElement.find(".fullscreen").before('<a href="#" class="ctrl-btn enlarge">');
            }
        } else {
            ctrlElement.find(".shrink").removeClass('shrink').addClass('enlarge');;
            ctrlElement.find(".unmute").before('<a href="#" class="ctrl-btn fullscreen">');
        }
        return;
    }
    switch (mode) {
        case MODES.GALAXY:
            ctrlElement.children('.shrink')
                .addClass('enlarge').removeClass('shrink').parent()
                .parent().removeClass('large').addClass('small');
            break;

        case MODES.MONITOR:
        case MODES.LECTURE:
            changeMode(MODES.LECTURE);
            break;
    }
}

function playpause() {
    var el = event.srcElement;
    if (el.getAttribute("isPause") != undefined) {
        el.innerText = "Pause Video";
        for (var tmp in room.remoteStreams) {
            var stream = room.remoteStreams[tmp];
            if (stream.id() !== localStream.id()) {
                stream.playVideo();
            } else {
                localStream.enableVideo();
            }
        }
        $(".noCamera").hide();
        el.removeAttribute("isPause");
    } else {
        el.innerText = "Play Video";
        for (var tmp in room.remoteStreams) {
            var stream = room.remoteStreams[tmp];
            if (stream.id() !== localStream.id()) {
                stream.pauseVideo();
            } else {
                localStream.disableVideo();
            }
        }
        $(".noCamera").show();
        el.setAttribute("isPause", "");
    }
}

function pauseVideo(){
    if(!isPauseVideo){
        room.pauseVideo(localStream, function() {
        console.log("Pause video Successfully");
        $('#pauseVideo').text("Play video");
        isPauseVideo=!isPauseVideo;},
        function() {console.log("Fail to pasuse video.");}
        );
    }else{
        room.playVideo(localStream, function() {
        console.log("Play video Successfully");
        $('#pauseVideo').text("Pause video");
        isPauseVideo=!isPauseVideo;},
        function() {console.log("Fail to play video.");}
        );
    }
}

function pauseAudio(){
    var msg={muted:true};
     if(!isPauseAudio){
        room.pauseAudio(localStream, function() {
        console.log("Pause Audio Successfully");
        $('#pauseAudio').text("Unmute Me");
        room.send(msg,'all');
        isPauseAudio=!isPauseAudio;},
        function() {console.log("Fail to pasuse audio.");}
        );
    }else{
        room.playAudio(localStream, function() {
        console.log("Play Audio Successfully");
        $('#pauseAudio').text("Mute Me");
        msg={muted:false};
        room.send(msg,'all');
        isPauseAudio=!isPauseAudio;},
        function() {console.log("Fail to play audio.");}
        );
    }
}

$(document).ready(function() {
    $('.buttonset>.button').click(function() {
        $(this).siblings('.button').removeClass('selected');
        $(this).addClass('selected');
    })

    // name
    if (window.location.search.slice(0, 6) === '?room=') {
        roomId = window.location.search.slice(6);
    }

    if (window.location.protocol === "https:") {
        isSecuredConnection = true;
        serverAddress = securedServerAddress;
        $('#screen-btn').removeClass('disabled');
    } else {
        isSecuredConnection = false;
        serverAddress = unsecuredServerAddress;
        $('#screen-btn').addClass('disabled');
    }

     $(document).on('click', '#pauseVideo', function() {
        pauseVideo();
    });

     $(document).on('click', '#pauseAudio', function() {
       pauseAudio();
    });

    $(document).on('click', '.shrink', function() {
        exitFullScreen($(this).parent());
        $(this).parent().parent().children('.player').trigger('resizeVideo');
        setTimeout(resizeStream, 500, mode);
    });

    $(document).on('click', '.enlarge', function() {
        switch (mode) {
            case MODES.GALAXY:
                $(this).addClass('shrink').removeClass('enlarge').parent()
                    .parent().removeClass('small').addClass('large');
                break;

            case MODES.MONITOR:
            case MODES.LECTURE:
                changeMode(MODES.LECTURE, $(this).parent().parent());
                break;
        }
        $(this).parent().parent().children('.player').trigger('resizeVideo');
        setTimeout(resizeStream, 500, mode);
    });

    $(document).on('click', '.mute', function() {
        // unmute
        var id = parseInt($(this).parent().parent().attr('id').slice(7));
        toggleMute(id, false);
        $(this).addClass('unmute').removeClass('mute');
    });

    $(document).on('click', '.unmute', function() {
        // mute
        var id = parseInt($(this).parent().parent().attr('id').slice(7));
        toggleMute(id, true);
        $(this).addClass('mute').removeClass('unmute');
    });

    $(document).on('dblclick', '.muteShow', function() {
        // mute others
        //console.log($(this).attr('isMuted')+"????");
        var mutedID=$(this).siblings('.userID').text();
        var isMuted=singleMute;
        var msg={
            fromName:streamObj[localStream.id()].attributes()["name"],
            toID:mutedID,
            mute:isMuted
        };
        if(localStream.id()!= mutedID){
        room.send(msg, 'all', function(mutedID) {
            L.Logger.info("local send mute "+mutedID+" message");
       }, function() {
            L.Logger.error("fail to mute others");
        });
        if($(this).attr('isMuted')){$("#msgText").text("You have unmuted "+streamObj[mutedID].attributes()["name"]);}
        else{ $("#msgText").text("You have muted "+streamObj[mutedID].attributes()["name"]);}
        // $(".msgBox").show();
        // $(".msgBox").fadeOut(6000);
    }
    });

    $(document).on('click', '.fullscreen', function() {
        fullScreen(true, $(this).parent().parent());
        var enlarge = $(this).siblings('.enlarge');
        if (enlarge.length > 0) {
            enlarge.removeClass('enlarge').addClass('shrink');
            isSmall = true;
        } else if ($(this).siblings('.shrink').length === 0) {
            var unmute = $(this).parent().find(".unmute");
            if (unmute.length > 0) {
                unmute.before('<a href="#" class="ctrl-btn shrink"></a>');
            } else {
                $(this).parent().append('<a href="#" class="ctrl-btn shrink"></a>');
            }
            isSmall = false;
        }
        $(this).remove();
    });

    $(document).keyup(function(event) {
        if (event.keyCode === 27 && $('.full-screen').length > 0) {
            console.log('full');
            // exit full screen when escape key pressed
            exitFullScreen($('.full-screen .ctrl'));
        }
    });

    $('#text-send').keypress(function(event) {
        if ($(this)[0].scrollHeight > $(this)[0].clientHeight) {
            $(this).height($(this)[0].scrollHeight);
            $('#text-content').css('bottom', $(this)[0].scrollHeight + 'px');
        }
        if (event.keyCode === 13) {
            event.preventDefault();
            // send msg when press enter
            sendIm();
        }
    });

    $('#login-input').keypress(function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            login();
        }
    });

    $('.dialog--close').click(function() {
        $(this).parent().parent().hide();
    });

    $.get('config.json', function(data) {
        if (data['rooms'] === undefined) {
            alert('No room reserved!');
            return;
        }
        for (var i = 0; i < data['rooms'].length; ++i) {
            if (data['rooms'][i]['id'] === roomId) {
                if (data['rooms'][i]['key']) {
                    serviceKey = data['rooms'][i]['key'];
                } else {
                    serviceKey = 'forward';
                }
                $('#titleText,#login-panel>h3').text(data['rooms'][i]['title']);
                if (data['rooms'][i]['date'] && data['rooms'][i]['start-time'] && data['rooms'][i]['end-time']) {
                    $('#titleTime,.time').text(data['rooms'][i]['date'] +
                        ' from ' + data['rooms'][i]['start-time'] + ' to ' + data['rooms'][i]['end-time']);
                    var s = new Date(data['rooms'][i]['date'] + ' ' + data['rooms'][i]['start-time']);
                    var e = new Date(data['rooms'][i]['date'] + ' ' + data['rooms'][i]['end-time']);
                    var now = new Date();
                    totalTime = e - s <= 0 ? 0 : (e - s) / 1000;
                    if (now - s <= 0) {
                        curTime = 0;
                    } else if (now - e >= 0) {
                        curTime = totalTime;
                    } else {
                        curTime = (now - s) / 1000;
                    }
                    updateProgress();
                }
                $('#login-panel').fadeIn();
                return;
            }
        }
        // no roomId founded
        alert('Illegal room id!');
    }).fail(function(e) {
        console.log(e);
        alert('Fail to load the JSON file. See press F12 to open console for more information and report to webtrc_support@intel.com.');
    });

    $(window).resize(function() {
        console.log('resized');
        changeMode(mode);
    });

    checkMobile();
});

$( window ).unload(function() {
    userExit();
});

function checkMobile() {
    if ((/iphone|ipod|android|ie|blackberry|fennec/).test(navigator.userAgent.toLowerCase())) {
        isMobile = true;
        $("#im-btn").hide();
        toggleIm(true);
        changeMode(MODES.MONITOR);
        $('#galaxy-btn, .button-split, #screen-btn').hide();
    }
}