"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RemotePeer, ChatMessage, ReactionEvent } from "@/types/meeting";

interface UseWebRTCOptions {
  meetingId: string;
  peerId: string;
  displayName: string;
  role: "host" | "participant";
  initialAudio?: boolean;
  initialVideo?: boolean;
  onRemovedByHost?: () => void;
  onMeetingEnded?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({
  meetingId,
  peerId,
  displayName,
  role,
  initialAudio = true,
  initialVideo = true,
  onRemovedByHost,
  onMeetingEnded,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(
    !initialAudio
  );

  const [isVideoOff, setIsVideoOff] = useState<boolean>(
    !initialVideo
  );

  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);

  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>(
    []
  );

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const [cameraError, setCameraError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const peerConnectionsRef = useRef<
    Record<string, RTCPeerConnection>
  >({});

  const localStreamRef = useRef<MediaStream | null>(null);

  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const originalVideoTrackRef =
    useRef<MediaStreamTrack | null>(null);

  /*
   * Keep callbacks in refs.
   *
   * MeetingRoom passes inline callback functions. Without refs,
   * those callback identity changes can cause the WebRTC effect to
   * reconnect unnecessarily.
   */
  const onRemovedByHostRef = useRef(onRemovedByHost);
  const onMeetingEndedRef = useRef(onMeetingEnded);

  useEffect(() => {
    onRemovedByHostRef.current = onRemovedByHost;
  }, [onRemovedByHost]);

  useEffect(() => {
    onMeetingEndedRef.current = onMeetingEnded;
  }, [onMeetingEnded]);

  /*
   * ------------------------------------------------------------
   * LOCAL CAMERA / MICROPHONE
   * ------------------------------------------------------------
   */

  const initLocalStream = useCallback(async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = initialAudio;
      });

      stream.getVideoTracks().forEach((track) => {
        track.enabled = initialVideo;
        originalVideoTrackRef.current = track;
      });

      localStreamRef.current = stream;

      setLocalStream(stream);
      setIsAudioMuted(!initialAudio);
      setIsVideoOff(!initialVideo);
      setCameraError(null);

      return stream;
    } catch (err) {
      console.warn(
        "Could not acquire audio/video hardware:",
        err
      );

      setCameraError(
        "Camera or microphone access was denied or not found."
      );

      /*
       * Try microphone-only fallback.
       */
      try {
        const audioStream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

        localStreamRef.current = audioStream;

        setLocalStream(audioStream);
        setIsVideoOff(true);

        return audioStream;
      } catch {
        /*
         * No microphone/camera available.
         */
        const emptyStream = new MediaStream();

        localStreamRef.current = emptyStream;

        setLocalStream(emptyStream);
        setIsAudioMuted(true);
        setIsVideoOff(true);

        return emptyStream;
      }
    }
  }, [initialAudio, initialVideo]);

  /*
   * ------------------------------------------------------------
   * CLOSE PEER CONNECTION
   * ------------------------------------------------------------
   */

  const closePeerConnection = useCallback(
    (targetPeerId: string) => {
      const pc =
        peerConnectionsRef.current[targetPeerId];

      if (pc) {
        try {
          pc.close();
        } catch {
          // Ignore already-closed connections.
        }

        delete peerConnectionsRef.current[targetPeerId];
      }

      setRemotePeers((prev) =>
        prev.filter(
          (peer) => peer.peer_id !== targetPeerId
        )
      );
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * CREATE PEER CONNECTION
   * ------------------------------------------------------------
   */

  const createPeerConnection = useCallback(
    (
      targetPeerId: string,
      targetName: string
    ) => {
      if (
        peerConnectionsRef.current[targetPeerId]
      ) {
        return peerConnectionsRef.current[targetPeerId];
      }

      const pc =
        new RTCPeerConnection(ICE_SERVERS);

      peerConnectionsRef.current[targetPeerId] = pc;

      /*
       * Add current local tracks.
       */
      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              pc.addTrack(
                track,
                localStreamRef.current!
              );
            } catch (err) {
              console.warn(
                "Could not add local track:",
                err
              );
            }
          });
      }

      /*
       * ICE candidates.
       */
      pc.onicecandidate = (event) => {
        if (
          event.candidate &&
          wsRef.current?.readyState ===
            WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              target: targetPeerId,
              candidate: event.candidate,
            })
          );
        }
      };

      /*
       * Remote media.
       */
      pc.ontrack = (event) => {
        const remoteStream =
          event.streams[0];

        if (!remoteStream) return;

        setRemotePeers((prev) => {
          const index = prev.findIndex(
            (peer) =>
              peer.peer_id === targetPeerId
          );

          if (index >= 0) {
            const updated = [...prev];

            updated[index] = {
              ...updated[index],
              stream: remoteStream,
            };

            return updated;
          }

          return [
            ...prev,
            {
              peer_id: targetPeerId,
              display_name:
                targetName || "Participant",
              role: "participant",
              is_muted: false,
              is_video_off: false,
              stream: remoteStream,
            },
          ];
        });
      };

      /*
       * Connection state.
       */
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState ===
            "disconnected" ||
          pc.connectionState === "failed"
        ) {
          closePeerConnection(
            targetPeerId
          );
        }
      };

      return pc;
    },
    [closePeerConnection]
  );

  /*
   * ------------------------------------------------------------
   * WEBSOCKET + SIGNALING
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;

    const cleanMeetingId =
      meetingId.replace(/[-\s]/g, "");

    const wsBase =
      process.env.NEXT_PUBLIC_WS_URL ||
      "ws://localhost:8000";

    const wsUrl =
      `${wsBase}/ws/meeting/${cleanMeetingId}/${peerId}` +
      `?name=${encodeURIComponent(displayName)}` +
      `&role=${role}`;

    const setup = async () => {
      try {
        await initLocalStream();

        if (cancelled) return;

        console.log(
          "Connecting WebSocket:",
          wsUrl
        );

        ws = new WebSocket(wsUrl);

        wsRef.current = ws;

        ws.onopen = () => {
          console.log(
            "WebSocket connected"
          );

          setConnectionStatus(
            "connected"
          );
        };

        ws.onmessage = async (
          event
        ) => {
          try {
            const data = JSON.parse(
              event.data
            );

            switch (data.type) {
              /*
               * ----------------------------------------
               * ROOM INFO
               * ----------------------------------------
               */

              case "room-info": {
                const existingList =
                  data.existing_peers ||
                  [];

                setRemotePeers(
                  existingList.map(
                    (peer: any) => ({
                      peer_id:
                        peer.peer_id,

                      display_name:
                        peer.display_name,

                      role:
                        peer.role,

                      is_muted:
                        peer.is_muted ??
                        false,

                      is_video_off:
                        peer.is_video_off ??
                        false,

                      is_hand_raised:
                        peer.is_hand_raised ??
                        false,
                    })
                  )
                );

                /*
                 * Create offers to existing users.
                 */
                for (const peer of existingList) {
                  const pc =
                    createPeerConnection(
                      peer.peer_id,
                      peer.display_name
                    );

                  const offer =
                    await pc.createOffer();

                  await pc.setLocalDescription(
                    offer
                  );

                  if (
                    ws &&
                    ws.readyState ===
                    WebSocket.OPEN
                  ) {
                    ws.send(
                      JSON.stringify({
                        type: "offer",
                        target:
                          peer.peer_id,
                        offer,
                      })
                    );
                  }
                }

                break;
              }

              /*
               * ----------------------------------------
               * USER JOINED
               * ----------------------------------------
               */

              case "user-joined": {
                const newcomer =
                  data.peer;

                if (
                  newcomer &&
                  newcomer.peer_id !== peerId
                ) {
                  setRemotePeers(
                    (prev) => {
                      if (
                        prev.some(
                          (peer) =>
                            peer.peer_id ===
                            newcomer.peer_id
                        )
                      ) {
                        return prev;
                      }

                      return [
                        ...prev,
                        {
                          peer_id:
                            newcomer.peer_id,

                          display_name:
                            newcomer.display_name,

                          role:
                            newcomer.role,

                          is_muted:
                            newcomer.is_muted ??
                            false,

                          is_video_off:
                            newcomer.is_video_off ??
                            false,

                          is_hand_raised:
                            newcomer.is_hand_raised ??
                            false,
                        },
                      ];
                    }
                  );
                }

                break;
              }

              /*
               * ----------------------------------------
               * USER LEFT
               * ----------------------------------------
               */

              case "user-left": {
                closePeerConnection(
                  data.peer_id
                );

                break;
              }

              /*
               * ----------------------------------------
               * OFFER
               * ----------------------------------------
               */

              case "offer": {
                const senderId =
                  data.sender;

                const senderName =
                  data.sender_name;

                const pc =
                  createPeerConnection(
                    senderId,
                    senderName
                  );

                await pc.setRemoteDescription(
                  new RTCSessionDescription(
                    data.offer
                  )
                );

                const answer =
                  await pc.createAnswer();

                await pc.setLocalDescription(
                  answer
                );

                if (
                  ws &&
                  ws.readyState ===
                  WebSocket.OPEN
                ) {
                  ws.send(
                    JSON.stringify({
                      type: "answer",
                      target: senderId,
                      answer,
                    })
                  );
                }

                break;
              }

              /*
               * ----------------------------------------
               * ANSWER
               * ----------------------------------------
               */

              case "answer": {
                const pc =
                  peerConnectionsRef.current[
                    data.sender
                  ];

                if (pc) {
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(
                      data.answer
                    )
                  );
                }

                break;
              }

              /*
               * ----------------------------------------
               * ICE CANDIDATE
               * ----------------------------------------
               */

              case "ice-candidate": {
                const pc =
                  peerConnectionsRef.current[
                    data.sender
                  ];

                if (
                  pc &&
                  data.candidate
                ) {
                  try {
                    await pc.addIceCandidate(
                      new RTCIceCandidate(
                        data.candidate
                      )
                    );
                  } catch (err) {
                    console.warn(
                      "Error adding ICE candidate:",
                      err
                    );
                  }
                }

                break;
              }

              /*
               * ----------------------------------------
               * REMOTE AUDIO / VIDEO STATE
               * ----------------------------------------
               */

              case "peer-state-changed": {
                setRemotePeers(
                  (prev) =>
                    prev.map(
                      (peer) => {
                        if (
                          peer.peer_id ===
                          data.peer_id
                        ) {
                          return {
                            ...peer,
                            [data.key]:
                              data.value,
                          };
                        }

                        return peer;
                      }
                    )
                );

                break;
              }

              /*
               * ----------------------------------------
               * FORCE MUTE
               * ----------------------------------------
               */

              case "force-mute": {
                if (
                  localStreamRef.current
                ) {
                  localStreamRef.current
                    .getAudioTracks()
                    .forEach(
                      (track) => {
                        track.enabled =
                          false;
                      }
                    );
                }

                setIsAudioMuted(true);

                break;
              }

              /*
               * ----------------------------------------
               * REMOVED BY HOST
               * ----------------------------------------
               */

              case "removed-by-host": {
                onRemovedByHostRef.current?.();
                break;
              }

              /*
               * ----------------------------------------
               * MEETING ENDED
               * ----------------------------------------
               */

              case "meeting-ended-by-host": {
                onMeetingEndedRef.current?.();
                break;
              }

              /*
               * ----------------------------------------
               * CHAT
               * ----------------------------------------
               */

              case "chat-broadcast": {
                setMessages(
                  (prev) => [
                    ...prev,
                    data,
                  ]
                );

                break;
              }

              /*
               * ----------------------------------------
               * REACTION
               * ----------------------------------------
               */

              case "reaction-broadcast": {
                const reaction: ReactionEvent =
                  {
                    id:
                      Math.random().toString(),

                    peer_id:
                      data.peer_id,

                    sender_name:
                      data.sender_name,

                    emoji:
                      data.emoji,
                  };

                setActiveReactions(
                  (prev) => [
                    ...prev,
                    reaction,
                  ]
                );

                window.setTimeout(
                  () => {
                    setActiveReactions(
                      (prev) =>
                        prev.filter(
                          (item) =>
                            item.id !==
                            reaction.id
                        )
                    );
                  },
                  4000
                );

                break;
              }

              default:
                break;
            }
          } catch (err) {
            console.error(
              "Error processing websocket message:",
              err
            );
          }
        };

        ws.onclose = (event) => {
          console.log(
            "WebSocket closed:",
            event.code,
            event.reason
          );

          setConnectionStatus(
            "disconnected"
          );
        };

        ws.onerror = (event) => {
          console.error(
            "WebSocket connection error.",
            {
              url: wsUrl,
              event,
            }
          );

          setConnectionStatus(
            "disconnected"
          );
        };
      } catch (err) {
        console.error(
          "WebRTC setup failed:",
          err
        );

        setConnectionStatus(
          "disconnected"
        );
      }
    };

    setup();

    return () => {
      cancelled = true;

      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;

        try {
          ws.close();
        } catch {}
      }

      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      Object.values(
        peerConnectionsRef.current
      ).forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });

      peerConnectionsRef.current = {};

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {}
          });

        localStreamRef.current = null;
      }

      if (screenTrackRef.current) {
        try {
          screenTrackRef.current.stop();
        } catch {}

        screenTrackRef.current = null;
      }
    };
  }, [
    meetingId,
    peerId,
    displayName,
    role,
    initLocalStream,
    createPeerConnection,
    closePeerConnection,
  ]);

  /*
   * ------------------------------------------------------------
   * TOGGLE MICROPHONE
   * ------------------------------------------------------------
   */

  const toggleAudio = useCallback(() => {
    const stream =
      localStreamRef.current;

    if (!stream) return;

    const audioTrack =
      stream.getAudioTracks()[0];

    if (!audioTrack) return;

    const nextState =
      !audioTrack.enabled;

    audioTrack.enabled =
      nextState;

    setIsAudioMuted(
      !nextState
    );

    if (
      wsRef.current?.readyState ===
      WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "state-change",
          key: "is_muted",
          value: !nextState,
        })
      );
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * TOGGLE VIDEO
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * First click:
   *     enabled -> false
   *
   * Second click:
   *     false -> true
   *
   * If the camera track has actually ended, we acquire
   * a completely new camera track.
   */

  const toggleVideo =
    useCallback(async () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        console.warn(
          "No local stream available."
        );
        return;
      }

      let videoTrack: MediaStreamTrack | undefined =
        stream.getVideoTracks()[0];

      /*
       * If current stream doesn't contain
       * the track, try our saved reference.
       */
      if (
        !videoTrack ||
        videoTrack.readyState === "ended"
      ) {
        videoTrack =
          originalVideoTrackRef.current ||
          undefined;
      }

      /*
       * NORMAL CASE
       *
       * Camera track exists and is usable.
       * Just toggle enabled.
       */
      if (
        videoTrack &&
        videoTrack.readyState !== "ended"
      ) {
        const nextState =
          !videoTrack.enabled;

        videoTrack.enabled =
          nextState;

        originalVideoTrackRef.current =
          videoTrack;

        setIsVideoOff(
          !nextState
        );

        if (
          wsRef.current?.readyState ===
          WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({
              type: "state-change",
              key: "is_video_off",
              value: !nextState,
            })
          );
        }

        return;
      }

      /*
       * RECOVERY CASE
       *
       * The previous camera track has ended.
       * Ask browser for a new camera.
       */

      try {
        console.log(
          "Re-acquiring camera..."
        );

        const freshStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
                facingMode:
                  "user",
              },
            }
          );

        const freshTrack =
          freshStream.getVideoTracks()[0];

        if (!freshTrack) {
          throw new Error(
            "No video track returned."
          );
        }

        /*
         * Remove old ended track.
         */
        const oldTrack =
          stream.getVideoTracks()[0];

        if (oldTrack) {
          try {
            stream.removeTrack(
              oldTrack
            );
          } catch {}
        }

        /*
         * Add new camera track.
         */
        stream.addTrack(
          freshTrack
        );

        freshTrack.enabled =
          true;

        originalVideoTrackRef.current =
          freshTrack;

        localStreamRef.current =
          stream;

        setLocalStream(
          stream
        );

        setIsVideoOff(false);
        setCameraError(null);

        /*
         * Replace video track in every
         * existing peer connection.
         */
        for (const pc of Object.values(
          peerConnectionsRef.current
        )) {
          const sender =
            pc
              .getSenders()
              .find(
                (item) =>
                  item.track?.kind ===
                  "video"
              );

          if (sender) {
            await sender.replaceTrack(
              freshTrack
            );
          } else {
            try {
              pc.addTrack(
                freshTrack,
                stream
              );
            } catch (err) {
              console.warn(
                "Could not add restarted camera track:",
                err
              );
            }
          }
        }

        /*
         * Tell other participants that
         * video is now active.
         */
        if (
          wsRef.current?.readyState ===
          WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({
              type: "state-change",
              key: "is_video_off",
              value: false,
            })
          );
        }

        console.log(
          "Camera restarted successfully."
        );
      } catch (err) {
        console.error(
          "Could not restart camera:",
          err
        );

        setCameraError(
          "Could not restart the camera. Check browser camera permissions."
        );

        setIsVideoOff(true);
      }
    }, []);

  /*
   * ------------------------------------------------------------
   * HAND RAISE
   * ------------------------------------------------------------
   */

  const toggleHandRaise =
    useCallback(() => {
      const nextState =
        !isHandRaised;

      setIsHandRaised(
        nextState
      );

      if (
        wsRef.current?.readyState ===
        WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: "state-change",
            key: "is_hand_raised",
            value: nextState,
          })
        );
      }
    }, [isHandRaised]);

  /*
   * ------------------------------------------------------------
   * SCREEN SHARE
   * ------------------------------------------------------------
   */

  const toggleScreenShare =
    useCallback(async () => {
      /*
       * STOP SCREEN SHARE
       */
      if (isScreenSharing) {
        if (
          screenTrackRef.current
        ) {
          try {
            screenTrackRef.current.stop();
          } catch {}

          screenTrackRef.current =
            null;
        }

        /*
         * Restore original camera.
         */
        const cameraTrack =
          originalVideoTrackRef.current;

        if (cameraTrack) {
          Object.values(
            peerConnectionsRef.current
          ).forEach((pc) => {
            const sender =
              pc
                .getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (sender) {
              sender.replaceTrack(
                cameraTrack
              );
            }
          });
        }

        setScreenStream(null);
        setIsScreenSharing(false);

        return;
      }

      /*
       * START SCREEN SHARE
       */

      try {
        const stream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
              audio: true,
            }
          );

        const screenTrack =
          stream.getVideoTracks()[0];

        if (!screenTrack) {
          return;
        }

        screenTrackRef.current =
          screenTrack;

        setScreenStream(
          stream
        );

        setIsScreenSharing(
          true
        );

        /*
         * Replace camera with screen
         * for every participant.
         */
        Object.values(
          peerConnectionsRef.current
        ).forEach((pc) => {
          const sender =
            pc
              .getSenders()
              .find(
                (item) =>
                  item.track?.kind ===
                  "video"
              );

          if (sender) {
            sender.replaceTrack(
              screenTrack
            );
          }
        });

        /*
         * Browser can end screen sharing
         * when user presses "Stop sharing".
         */
        screenTrack.onended =
          () => {
            screenTrackRef.current =
              null;

            setScreenStream(null);
            setIsScreenSharing(
              false
            );

            const cameraTrack =
              originalVideoTrackRef.current;

            if (cameraTrack) {
              Object.values(
                peerConnectionsRef.current
              ).forEach((pc) => {
                const sender =
                  pc
                    .getSenders()
                    .find(
                      (item) =>
                        item.track?.kind ===
                        "video"
                    );

                if (sender) {
                  sender.replaceTrack(
                    cameraTrack
                  );
                }
              });
            }
          };
      } catch (err) {
        console.warn(
          "Screen share cancelled or failed:",
          err
        );
      }
    }, [isScreenSharing]);

  /*
   * ------------------------------------------------------------
   * CHAT
   * ------------------------------------------------------------
   */

  const sendMessage =
    useCallback(
      (
        message: string,
        recipient: string = "everyone"
      ) => {
        if (
          !message.trim() ||
          !wsRef.current
        ) {
          return;
        }

        if (
          wsRef.current.readyState !==
          WebSocket.OPEN
        ) {
          return;
        }

        wsRef.current.send(
          JSON.stringify({
            type: "chat-message",
            message,
            recipient,
          })
        );
      },
      []
    );

  /*
   * ------------------------------------------------------------
   * REACTIONS
   * ------------------------------------------------------------
   */

  const sendReaction =
    useCallback(
      (emoji: string) => {
        if (
          !wsRef.current ||
          wsRef.current.readyState !==
            WebSocket.OPEN
        ) {
          return;
        }

        wsRef.current.send(
          JSON.stringify({
            type: "reaction",
            emoji,
          })
        );

        const reaction: ReactionEvent =
          {
            id:
              Math.random().toString(),

            peer_id: peerId,

            sender_name:
              displayName,

            emoji,
          };

        setActiveReactions(
          (prev) => [
            ...prev,
            reaction,
          ]
        );

        window.setTimeout(
          () => {
            setActiveReactions(
              (prev) =>
                prev.filter(
                  (item) =>
                    item.id !==
                    reaction.id
                )
            );
          },
          4000
        );
      },
      [displayName, peerId]
    );

  /*
   * ------------------------------------------------------------
   * HOST: MUTE ALL
   * ------------------------------------------------------------
   */

  const hostMuteAll =
    useCallback(() => {
      if (
        role !== "host" ||
        !wsRef.current ||
        wsRef.current.readyState !==
          WebSocket.OPEN
      ) {
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "mute-all",
        })
      );
    }, [role]);

  /*
   * ------------------------------------------------------------
   * HOST: REMOVE PARTICIPANT
   * ------------------------------------------------------------
   */

  const hostRemovePeer =
    useCallback(
      (targetPeerId: string) => {
        if (
          role !== "host" ||
          !wsRef.current ||
          wsRef.current.readyState !==
            WebSocket.OPEN
        ) {
          return;
        }

        wsRef.current.send(
          JSON.stringify({
            type: "remove-peer",
            target_peer_id:
              targetPeerId,
          })
        );

        closePeerConnection(
          targetPeerId
        );
      },
      [role, closePeerConnection]
    );

  /*
   * ------------------------------------------------------------
   * HOST: END MEETING
   * ------------------------------------------------------------
   */

  const hostEndMeeting =
    useCallback(() => {
      if (
        role !== "host" ||
        !wsRef.current ||
        wsRef.current.readyState !==
          WebSocket.OPEN
      ) {
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "end-meeting",
        })
      );
    }, [role]);

  /*
   * ------------------------------------------------------------
   * VIRTUAL PARTICIPANT
   * ------------------------------------------------------------
   */

  const addVirtualParticipant =
    useCallback(() => {
      const mockNames = [
        "Sarah Chen (Product)",
        "Michael Scott (Eng Lead)",
        "Emily Davis (Design)",
        "David Kim (Fullstack)",
      ];

      const existingNames =
        remotePeers.map(
          (peer) =>
            peer.display_name
        );

      const available =
        mockNames.filter(
          (name) =>
            !existingNames.includes(
              name
            )
        );

      const nameToAdd =
        available[0] ||
        `Guest_${Math.floor(
          Math.random() * 900 + 100
        )}`;

      const mockId =
        `mock-peer-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

      setRemotePeers(
        (prev) => [
          ...prev,
          {
            peer_id: mockId,
            display_name:
              nameToAdd,
            role:
              "participant",
            is_muted: false,
            is_video_off: false,
            is_hand_raised:
              false,
          },
        ]
      );
    }, [remotePeers]);

  /*
   * ------------------------------------------------------------
   * RETURN
   * ------------------------------------------------------------
   */

  return {
    localStream,
    screenStream,

    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,

    remotePeers,
    messages,
    activeReactions,

    connectionStatus,
    cameraError,

    toggleAudio,
    toggleVideo,
    toggleHandRaise,
    toggleScreenShare,

    sendMessage,
    sendReaction,

    hostMuteAll,
    hostRemovePeer,
    hostEndMeeting,

    addVirtualParticipant,
  };
}