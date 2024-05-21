// const signaling = new BroadcastChannel('test')
// signaling.onmessage = e => {
//     switch(e.data.type) {
//         case 'answer':
//             console.log("answer revived")
//             break
//         default:
//             console.log('unhandled')
//             break
//     }
// }
// let pc
// let localStream
// let localVideo = document.getElementById('localVideo')
// let remoteVideo = document.getElementById('remoteVideo')

// const socket = io("localhost:5001", {
//     transports: ["websocket"],
//     cors: {
//       origin: "http://localhost:3000/",
//     },
//   });

//   socket.on('ready', () => {
//     if(pc) {
//         console.log("already in call")
//         return
//     }
//     console.log("ready received")
//     makeCall()
//   })

//   socket.on('answer',(data) => {
//     handleAnswer(data)
//   })

//   socket.on('offer', (data) => {
//     handleOffer(data)
//   })

//   socket.on('candidate', (data) => {
//     handleCandidate(data)
//   })

// let callButton = document.getElementById('startButton')
// // callButton.addEventListener('click', () => {
// //     // signaling.postMessage({type: 'answer'})
// //     socket.emit('answer', {"data": "data"})
// // })

// callButton.onclick = async () => {
//     console.log("clicked")
//     localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
//     localVideo.srcObject = localStream;
//     socket.emit('ready', {'data': 'data'} )
// }



// async function makeCall() {
//     createPeerConnection();
  
//     const offer = await pc.createOffer();
//   //   signaling.postMessage({type: 'offer', sdp: offer.sdp});
//     socket.emit('offer', { 'type': 'offer','sdp': offer.sdp})
//     console.log('created offer',offer)
//     await pc.setLocalDescription(offer);
//   }

//   async function handleAnswer(answer) {
//     console.log('handling answer')
//     if (!pc) {
//       console.error('no peerconnection');
//       return;
//     }
//     console.log('received answer', answer)
//     await pc.setRemoteDescription(answer);
//   }

//   async function handleCandidate(candidate) {
//     console.log('handling candidate')
//     if (!pc) {
//       console.error('no peerconnection');
//       return;
//     }
//     if (!candidate.candidate) {
//       await pc.addIceCandidate(null);
//     } else {
//       await pc.addIceCandidate(candidate);
//     }
//   }

//   async function handleOffer(offer) {
//     console.log('handling offer')
//     console.log('received offer is: ', offer)

//     if (pc) {
//       console.error('existing peerconnection');
//       return;
//     }
//     await createPeerConnection();
//     await pc.setRemoteDescription(offer);
  
//     const answer = await pc.createAnswer();
//     // signaling.postMessage({type: 'answer', sdp: answer.sdp});
//     socket.emit('answer', { 'type': 'answer','sdp': answer.sdp})
//     await pc.setLocalDescription(answer);
//   }


//   function createPeerConnection() {
//     console.log("inside create peer connection")
//     pc = new RTCPeerConnection({
//         iceServers:[
//             {
//                 urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
//             }
//         ]
//     });
//     pc.onicecandidate = async e => {
//         console.log("ice candidate event triggered")
//       const message = {
//         type: 'candidate',
//         candidate: null,
//       };
//       if (e.candidate) {
//         message.candidate = e.candidate.candidate;
//         message.sdpMid = e.candidate.sdpMid;
//         message.sdpMLineIndex = e.candidate.sdpMLineIndex;
//       }
//     //   signaling.postMessage(message);
//       socket.emit('candidate', message)
//     };
//     pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
//     if(localStream) {
//         localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
//     }
//   }

let localStream
let remoteStream
let localVideo = document.getElementById('localVideo')
let peerConnection
let remoteVideo = document.getElementById('remoteVideo')
let offerOutput = document.getElementById('offerOutput')
let offerInput = document.getElementById('offerInput')
let answerOutput = document.getElementById('answerOutput')
let answerInput = document.getElementById('answerInput')
let offerSubmit = document.getElementById('offerSubmit')
let answerSubmit = document.getElementById('answerSubmit')

const socket = io("localhost:5001", {
        transports: ["websocket"],
        cors: {
          origin: "http://localhost:3000/",
        },
      });

remoteVideo.onloadedmetadata = () => {
    remoteVideo.play()
}

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

socket.on('candidate', (data) => {
    console.log("candidate received")
    if(peerConnection) {
        if(peerConnection.currentRemoteDescription){

            peerConnection.addIceCandidate(data.candidate)
        }
    }
})

async function init() {
    localStream = await navigator.mediaDevices.getUserMedia({audio:false, video:true})
    localVideo.srcObject = localStream
    createOffer()
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers)
    remoteStream = new MediaStream()
    remoteVideo.srcObject = remoteStream
    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({audio:false, video:true})
        localVideo.srcObject = localStream
    }
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })
    peerConnection.ontrack = (event) => {
        console.log('track received')
        event.streams[0].getTracks().forEach((track) => {
            console.log(track)
            remoteStream.addTrack(track)
        }) 
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate) {
            console.log('new ice candidate is: ', event.candidate)
            socket.emit('candidate', {'type': 'candidate', 'candidate': event.candidate})
        }
    }
}

offerSubmit.onclick = async () => {
    await createAnswer(JSON.parse(offerInput.value))
}

socket.on('offer',async (data) => {
    console.log('offer received')
    await createAnswer(data)
})

socket.on('answer', async (data) => {
    console.log('answer received')
    await addAnswer(data)
})

answerSubmit.onclick = async () => {
    await addAnswer(JSON.parse(answerInput.value))
}

async function createOffer() {
    await createPeerConnection()
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    console.log(offer)
    offerOutput.textContent = JSON.stringify(offer)
    socket.emit('offer', offer)
}

async function createAnswer(offer) {
    await createPeerConnection()
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer() 
    await peerConnection.setLocalDescription(answer)
    // SEND ANSWER TO THE SECOND PEER
    answerOutput.textContent = JSON.stringify(answer)
    socket.emit('answer', answer)
}

async function addAnswer(answer) {
    if(!peerConnection.currentRemoteDescription){
        console.log('input received')
        await peerConnection.setRemoteDescription(answer)
    }
}

let callButton = document.getElementById('startButton')
callButton.addEventListener('click', () => {
    init()
})
