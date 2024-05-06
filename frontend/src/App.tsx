import { FormEvent, useRef, useState } from "react";
import { createRoom, joinRoomById, startStream } from "./firebase/controler";

function App() {
	const localStreamRef = useRef<HTMLVideoElement | null>(null);
	const remoteStreamRef = useRef<HTMLVideoElement | null>(null);
	const [roomId, setRoomId] = useState<null | string>(null);
	const [isLoading, setIsLoading] = useState(false);

	const startWebCam = async () => {
		const { localStream, remoteStream } = await startStream();

		if (localStreamRef.current && remoteStreamRef.current) {
			localStreamRef.current.srcObject = localStream;
			remoteStreamRef.current.srcObject = remoteStream;
		}
	};

	const handleCreateRoom = async () => {
		try {
			setIsLoading(true);
			await startWebCam();
			const id = await createRoom();
			setRoomId(id);
			setIsLoading(false);
		} catch (e) {
			console.log(e);
			//TODO: HANDLE ERROR
		}
	};

	const handleJoinRoom = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			if (roomId) {
				setIsLoading(true);
				await startWebCam();
				await joinRoomById(roomId);
				setIsLoading(false);
			}
		} catch (e) {
			console.log(e);
			//TODO: HANDLE ERROR
		}
	};

	return (
		<>
			{/*video diplay section*/}
			<section className="max-w-[50%] flex p-14 gap-4 bg-gray-900">
				<div className="border border-white">
					<video ref={localStreamRef} autoPlay playsInline />
				</div>

				<div className="border border-white">
					<video ref={remoteStreamRef} autoPlay playsInline />
				</div>
			</section>

			{/* create or join room warpper */}
			<div>
				{/* create and display room id wrapper*/}
				<div>
					{roomId ? (
						<h1>{roomId}</h1>
					) : (
						<button
							onClick={handleCreateRoom}
							className="bg-black text-white p-4 rounded-lg m-4 hover:text-black hover:bg-white hover:border hover:border-black"
						>
							{isLoading ? "Loading..." : "Create Room"}
						</button>
					)}
				</div>

				{/* join room by id wrapper*/}
				<div>
					<form onSubmit={(e) => handleJoinRoom(e)}>
						<input
							onChange={(e) => setRoomId(e.target.value)}
							className="bg-red-300"
							placeholder="add your key"
						/>
						<button>{isLoading ? "Joining..." : "Join"}</button>
					</form>
				</div>
			</div>
		</>
	);
}

export default App;
