import React, { useEffect, MutableRefObject, useRef, useState } from "react";
import "./App.css";

const VideoRoom: React.FC = () => {
  const refSelfMediaStream: MutableRefObject<MediaStream | null> = useRef(null);
  const refSelfVideo: MutableRefObject<HTMLVideoElement | null> = useRef(null);
  const refPc1: MutableRefObject<RTCPeerConnection> = useRef(
    new RTCPeerConnection()
  );
  const refPc2: MutableRefObject<RTCPeerConnection> = useRef(
    new RTCPeerConnection()
  );
  const refPeerTrackEvents: MutableRefObject<RTCTrackEvent[]> = useRef([]);
  const refPeerVideoElemRefs: MutableRefObject<{
    [peerId: string]: MutableRefObject<HTMLVideoElement | null>;
  }> = useRef({});

  const [peer, setPeer] = useState(false);

  useEffect(() => {
    console.log(refSelfVideo.current);
    const pc1 = refPc1.current;
    const pc2 = refPc2.current;
    const func = async () => {
      const selfMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 320 },
      });

      refSelfMediaStream.current = selfMediaStream;
      refSelfVideo.current!.srcObject = selfMediaStream;

      pc2.addEventListener("track", (e) => {
        refPeerTrackEvents.current.push(e);
        if (refPeerTrackEvents.current.length === 2) {
          refPeerVideoElemRefs.current["peer"] = React.createRef();
          setPeer(true);
        }
      });
      pc1.addEventListener("icecandidate", (e) => {
        if (e.candidate !== null) pc2.addIceCandidate(e.candidate);
      });
      pc2.addEventListener("icecandidate", (e) => {
        if (e.candidate !== null) pc1.addIceCandidate(e.candidate);
      });
      pc1.addEventListener("negotiationneeded", async (e) => {
        const offer = await pc1.createOffer();
        await pc1.setLocalDescription(offer);
        await pc2.setRemoteDescription(offer);

        const answer = await pc2.createAnswer();
        await pc2.setLocalDescription(answer);
        await pc1.setRemoteDescription(answer);
      });

      selfMediaStream.getTracks().forEach((track) => {
        pc1.addTrack(track, selfMediaStream);
      });
    };
    func();

    return () => {
      refSelfMediaStream.current!.getTracks().forEach((track) => track.stop());
      pc1.close();
      pc2.close();
    };
  }, []);

  useEffect(() => {
    console.log(`useEffect peer: ${peer}`);
    const events = refPeerTrackEvents.current;
    if (peer) {
      const elem = refPeerVideoElemRefs.current["peer"].current!;
      refPeerTrackEvents.current.forEach((e) => {
        if (elem.srcObject) {
          (elem.srcObject as MediaStream).addTrack(e.track);
        } else {
          elem.srcObject = e.streams[0];
        }
      });
    }

    return () => {
      if (peer) {
        events.forEach((e) => e.track.stop());
      }
    };
  }, [peer]);

  return (
    <div>
      <div>
        <video ref={refSelfVideo} autoPlay />
      </div>
      {peer ? (
        <video ref={refPeerVideoElemRefs.current["peer"]} autoPlay />
      ) : (
        <div />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isJoin, setIsJoin] = useState(true);

  return (
    <div className="App">
      <button
        onClick={() => {
          setIsJoin((b) => !b);
        }}
      >
        {isJoin ? "Leave" : "Join"}
      </button>
      <div>{isJoin ? <VideoRoom /> : <div />}</div>
    </div>
  );
};

export default App;