import {
	addDoc,
	collection,
	doc,
	getDoc,
	onSnapshot,
	setDoc,
	updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const servers = {
	iceServers: [
		{
			urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
		},
	],
	iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

export const startStream = async () => {
	const localStream: MediaStream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: true,
	});
	const remoteStream: MediaStream = new MediaStream();

	// Push tracks from local stream to peer connection
	localStream.getTracks().forEach((track) => {
		pc.addTrack(track, localStream);
	});

	// Pull tracks from remote stream, add to video stream
	pc.ontrack = (event) => {
		event.streams[0].getTracks().forEach((track) => {
			remoteStream.addTrack(track);
		});
	};

	return { localStream, remoteStream };
};

// create a room
export const createRoom = async () => {
	// Reference Firestore collections for signaling
	const roomDoc = doc(collection(db, "rooms"));
	const offerCandidates = collection(roomDoc, "offerCandidates");
	const answerCandidates = collection(roomDoc, "answerCandidates");

	console.log("room created", roomDoc.id);

	// Get candidates for caller, save to db
	pc.onicecandidate = (event) => {
		event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
	};

	// Create offer
	const offerDescription = await pc.createOffer();
	await pc.setLocalDescription(offerDescription);

	const offer = {
		sdp: offerDescription.sdp,
		type: offerDescription.type,
	};

	try {
		await setDoc(roomDoc, { offer });
	} catch (e) {
		console.log("error on setdoc", e);
	}

	// Listen for remote answer
	onSnapshot(roomDoc, (snapshot) => {
		const data = snapshot.data();
		if (!pc.currentRemoteDescription && data?.answer) {
			const answerDescription = new RTCSessionDescription(data.answer);
			pc.setRemoteDescription(answerDescription);
			console.log("remote room call answer");
		}
	});

	// Listen for remote ICE candidates
	onSnapshot(answerCandidates, (snapshot) => {
		console.log("lisiging to changes on call answer ");
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const candidate = new RTCIceCandidate(change.doc.data());
				pc.addIceCandidate(candidate);
				console.log("ICE answer");
			}
		});
	});

	return roomDoc.id;
};

export const joinRoomById = async (callId: string) => {
	const roomDoc = doc(collection(db, "rooms"), callId);
	const offerCandidates = collection(roomDoc, "offerCandidates");
	const answerCandidates = collection(roomDoc, "answerCandidates");

	pc.onicecandidate = (event) => {
		event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
	};

	// Fetch data, then set the offer & answer
	const callData = (await getDoc(roomDoc)).data();

	if (callData) {
		const offerDescription = callData.offer;
		await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

		const answerDescription = await pc.createAnswer();
		await pc.setLocalDescription(answerDescription);

		const answer = {
			type: answerDescription.type,
			sdp: answerDescription.sdp,
		};

		try {
			await updateDoc(roomDoc, { answer });
		} catch (e) {
			console.log("error white updating doc", e);
		}

		// Listen to offer candidates
		onSnapshot(offerCandidates, (snapshot) => {
			console.log("lisiging to changes on call answer ");
			snapshot.docChanges().forEach((change) => {
				console.log("lisiging to changes on call answer 2");
				if (change.type === "added") {
					const data = change.doc.data();
					pc.addIceCandidate(new RTCIceCandidate(data));
				}
			});
		});
	}
};

// local video stream
//export const localVideoStream = async () => {
//localStream = await navigator.mediaDevices.getUserMedia({
//video: true,
//audio: true,
//});

//// Push tracks from local stream to peer connection
//localStream.getTracks().forEach((track) => {
//pc.addTrack(track, localStream);
//});

//// remote
////await remoteVideoStream();

//return localStream;
//};

//export const remoteVideoStream = async () => {
//remoteStream = new MediaStream();

//// Pull tracks from remote stream, add to video stream
//pc.ontrack = (event) => {
//event.streams[0].getTracks().forEach((track) => {
//remoteStream.addTrack(track);
//});
//};
//console.log("remote", remoteStream);

//return remoteStream;
//};
