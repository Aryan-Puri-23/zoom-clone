"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  X,
  Video,
  Mic,
  Monitor,
  Volume2,
  Check,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab =
  | "video"
  | "audio"
  | "general";

export const SettingsModal: React.FC<
  SettingsModalProps
> = ({
  isOpen,
  onClose,
}) => {
  /* =========================================================
     TAB
  ========================================================= */

  const [activeTab, setActiveTab] =
    useState<Tab>("video");

  /* =========================================================
     VIDEO SETTINGS
  ========================================================= */

  const [hasCamera, setHasCamera] =
    useState(true);

  const [cameraError, setCameraError] =
    useState<string | null>(null);

  const [mirrorVideo, setMirrorVideo] =
    useState(true);

  const [hdVideo, setHdVideo] =
    useState(true);

  const [touchUp, setTouchUp] =
    useState(false);

  /* =========================================================
     AUDIO SETTINGS
  ========================================================= */

  const [micLevel, setMicLevel] =
    useState(0);

  const [autoMic, setAutoMic] =
    useState(true);

  const [noiseSuppression, setNoiseSuppression] =
    useState(true);

  const [speakerTested, setSpeakerTested] =
    useState(false);

  /* =========================================================
     GENERAL SETTINGS
  ========================================================= */

  const [startWithWindows, setStartWithWindows] =
    useState(false);

  const [dualMonitors, setDualMonitors] =
    useState(false);

  const [autoFullscreen, setAutoFullscreen] =
    useState(false);

  const [alwaysShowControls, setAlwaysShowControls] =
    useState(true);

  /* =========================================================
     VIDEO REF
  ========================================================= */

  const videoPreviewRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const cameraStreamRef =
    useRef<MediaStream | null>(
      null
    );

  /* =========================================================
     AUDIO REFS
  ========================================================= */

  const micStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const audioContextRef =
    useRef<AudioContext | null>(
      null
    );

  const analyserRef =
    useRef<AnalyserNode | null>(
      null
    );

  const animationFrameRef =
    useRef<number | null>(
      null
    );

  /* =========================================================
     STOP CAMERA
  ========================================================= */

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      cameraStreamRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject =
        null;
    }
  };

  /* =========================================================
     START CAMERA
  ========================================================= */

  const startCamera = async () => {
    stopCamera();

    setCameraError(null);

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setHasCamera(false);
      setCameraError(
        "Camera access is not supported by this browser."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: hdVideo
                ? 1280
                : 640,
            },
            height: {
              ideal: hdVideo
                ? 720
                : 360,
            },
            facingMode: "user",
          },
          audio: false,
        });

      cameraStreamRef.current =
        stream;

      setHasCamera(true);

      const video =
        videoPreviewRef.current;

      if (video) {
        video.srcObject =
          stream;

        video.muted = true;

        await video.play().catch(
          () => {}
        );
      }

    } catch (error) {
      console.error(
        "Settings camera error:",
        error
      );

      setHasCamera(false);

      setCameraError(
        "Could not access your camera. Check browser permissions."
      );
    }
  };

  /* =========================================================
     CAMERA LIFECYCLE
  ========================================================= */

  useEffect(() => {
    if (
      !isOpen ||
      activeTab !== "video"
    ) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };

  }, [
    isOpen,
    activeTab,
  ]);

  /* =========================================================
     RESTART CAMERA WHEN HD CHANGES
  ========================================================= */

  useEffect(() => {
    if (
      isOpen &&
      activeTab === "video"
    ) {
      startCamera();
    }

    return () => {};

  }, [hdVideo]);

  /* =========================================================
     MIRROR VIDEO
  ========================================================= */

  useEffect(() => {
    if (!videoPreviewRef.current) {
      return;
    }

    videoPreviewRef.current.style.transform =
      mirrorVideo
        ? "scaleX(-1)"
        : "scaleX(1)";
  }, [
    mirrorVideo,
  ]);

  /* =========================================================
     MICROPHONE METER
  ========================================================= */

  const stopMicMeter = () => {
    if (
      animationFrameRef.current
    ) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current =
        null;
    }

    if (micStreamRef.current) {
      micStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      micStreamRef.current =
        null;
    }

    if (audioContextRef.current) {
      audioContextRef.current
        .close()
        .catch(() => {});

      audioContextRef.current =
        null;
    }

    analyserRef.current =
      null;

    setMicLevel(0);
  };

  const startMicMeter = async () => {
    stopMicMeter();

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation:
              true,
            noiseSuppression:
              noiseSuppression,
            autoGainControl:
              autoMic,
          },
          video: false,
        });

      micStreamRef.current =
        stream;

      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      audioContextRef.current =
        audioContext;

      const analyser =
        audioContext.createAnalyser();

      analyser.fftSize = 256;

      analyser.smoothingTimeConstant =
        0.8;

      analyserRef.current =
        analyser;

      const source =
        audioContext.createMediaStreamSource(
          stream
        );

      source.connect(analyser);

      const dataArray =
        new Uint8Array(
          analyser.frequencyBinCount
        );

      const updateMeter =
        () => {
          if (!analyserRef.current) {
            return;
          }

          analyserRef.current.getByteFrequencyData(
            dataArray
          );

          let sum = 0;

          for (
            let i = 0;
            i < dataArray.length;
            i++
          ) {
            sum += dataArray[i];
          }

          const average =
            dataArray.length
              ? sum /
                dataArray.length
              : 0;

          const normalized =
            Math.min(
              100,
              Math.round(
                (average / 128) *
                  100
              )
            );

          setMicLevel(
            normalized
          );

          animationFrameRef.current =
            requestAnimationFrame(
              updateMeter
            );
        };

      updateMeter();

    } catch (error) {
      console.error(
        "Microphone meter error:",
        error
      );
    }
  };

  /* =========================================================
     AUDIO TAB LIFECYCLE
  ========================================================= */

  useEffect(() => {
    if (
      isOpen &&
      activeTab === "audio"
    ) {
      startMicMeter();
    } else {
      stopMicMeter();
    }

    return () => {
      stopMicMeter();
    };

  }, [
    isOpen,
    activeTab,
  ]);

  /* =========================================================
     SPEAKER TEST
  ========================================================= */

  const testSpeaker = async () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const context =
        new AudioContextClass();

      if (
        context.state ===
        "suspended"
      ) {
        await context.resume();
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type =
        "sine";

      oscillator.frequency.value =
        660;

      gain.gain.value =
        0.12;

      oscillator.connect(
        gain
      );

      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime +
          0.35
      );

      oscillator.onended = () => {
        context
          .close()
          .catch(() => {});
      };

      setSpeakerTested(
        true
      );

    } catch (error) {
      console.error(
        "Speaker test failed:",
        error
      );
    }
  };

  /* =========================================================
     CLOSE CLEANUP
  ========================================================= */

  const handleClose = () => {
    stopCamera();
    stopMicMeter();
    onClose();
  };

  /* =========================================================
     DON'T RENDER
  ========================================================= */

  if (!isOpen) {
    return null;
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">

          <div>
            <h3 className="font-semibold text-gray-900 text-base">
              Settings
            </h3>

            <p className="text-[11px] text-gray-500 mt-0.5">
              Configure your meeting audio and video
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* SIDEBAR */}

          <div className="w-44 shrink-0 bg-gray-50 border-r border-gray-200 p-3 space-y-1">

            <button
              onClick={() =>
                setActiveTab(
                  "video"
                )
              }
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "video"
                  ? "bg-[#0E71EB] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>

            <button
              onClick={() =>
                setActiveTab(
                  "audio"
                )
              }
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "audio"
                  ? "bg-[#0E71EB] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Mic className="w-4 h-4" />
              Audio
            </button>

            <button
              onClick={() =>
                setActiveTab(
                  "general"
                )
              }
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "general"
                  ? "bg-[#0E71EB] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Monitor className="w-4 h-4" />
              General
            </button>

          </div>

          {/* CONTENT */}

          <div className="flex-1 overflow-y-auto p-6">

            {/* =================================================
                VIDEO
            ================================================= */}

            {activeTab === "video" && (
              <div className="space-y-5">

                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Camera
                  </h4>

                  <p className="text-xs text-gray-500 mt-1">
                    Preview and configure your camera.
                  </p>
                </div>

                {/* CAMERA PREVIEW */}

                <div className="relative aspect-video bg-[#202124] rounded-xl overflow-hidden">

                  {!hasCamera ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">

                      <VideoOffIcon />

                      <p className="text-sm font-medium mt-3">
                        Camera unavailable
                      </p>

                      <p className="text-xs text-gray-400 mt-1 text-center px-6">
                        {cameraError ||
                          "Allow camera access in your browser settings."}
                      </p>

                    </div>
                  ) : (
                    <video
                      ref={
                        videoPreviewRef
                      }
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}

                  {touchUp && (
                    <div className="absolute inset-0 pointer-events-none bg-white/5 backdrop-blur-[0.5px]" />
                  )}

                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[11px] px-2.5 py-1.5 rounded-lg">
                    Camera preview
                  </div>

                </div>

                {/* CAMERA OPTIONS */}

                <div className="space-y-3">

                  <SettingToggle
                    label="Mirror my video"
                    description="Flip your camera preview horizontally."
                    checked={mirrorVideo}
                    onChange={
                      setMirrorVideo
                    }
                  />

                  <SettingToggle
                    label="HD video"
                    description="Use higher resolution when supported."
                    checked={hdVideo}
                    onChange={
                      setHdVideo
                    }
                  />

                  <SettingToggle
                    label="Touch up my appearance"
                    description="Apply a subtle appearance smoothing effect."
                    checked={touchUp}
                    onChange={
                      setTouchUp
                    }
                  />

                </div>

              </div>
            )}

            {/* =================================================
                AUDIO
            ================================================= */}

            {activeTab === "audio" && (
              <div className="space-y-6">

                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Audio
                  </h4>

                  <p className="text-xs text-gray-500 mt-1">
                    Test your microphone and speaker.
                  </p>
                </div>

                {/* MICROPHONE */}

                <div className="border border-gray-200 rounded-xl p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-[#eef5ff] text-[#0E71EB] flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-gray-900">
                        Microphone
                      </h5>

                      <p className="text-[11px] text-gray-500">
                        Default microphone
                      </p>
                    </div>

                  </div>

                  <div className="mt-5">

                    <div className="flex items-center justify-between mb-2">

                      <span className="text-[11px] text-gray-500">
                        Input level
                      </span>

                      <span className="text-[11px] font-medium text-gray-700">
                        {micLevel}%
                      </span>

                    </div>

                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-[#0E71EB] transition-all duration-75"
                        style={{
                          width: `${micLevel}%`,
                        }}
                      />

                    </div>

                  </div>

                  <div className="mt-4 space-y-3">

                    <SettingToggle
                      label="Automatically adjust microphone volume"
                      checked={autoMic}
                      onChange={
                        setAutoMic
                      }
                    />

                    <SettingToggle
                      label="Noise suppression"
                      checked={
                        noiseSuppression
                      }
                      onChange={
                        setNoiseSuppression
                      }
                    />

                  </div>

                </div>

                {/* SPEAKER */}

                <div className="border border-gray-200 rounded-xl p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-[#eef5ff] text-[#0E71EB] flex items-center justify-center">
                      <Volume2 className="w-4 h-4" />
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-gray-900">
                        Speaker
                      </h5>

                      <p className="text-[11px] text-gray-500">
                        Default speaker
                      </p>
                    </div>

                  </div>

                  <button
                    onClick={
                      testSpeaker
                    }
                    className="mt-4 w-full h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center justify-center gap-2"
                  >
                    {speakerTested ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Speaker tested
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Test speaker
                      </>
                    )}
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                GENERAL
            ================================================= */}

            {activeTab === "general" && (
              <div className="space-y-5">

                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    General
                  </h4>

                  <p className="text-xs text-gray-500 mt-1">
                    General meeting preferences.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">

                  <SettingToggle
                    label="Start Zoom when I start Windows"
                    description="Launch the application automatically."
                    checked={
                      startWithWindows
                    }
                    onChange={
                      setStartWithWindows
                    }
                  />

                  <SettingToggle
                    label="Use dual monitors"
                    description="Optimize meetings for multiple displays."
                    checked={
                      dualMonitors
                    }
                    onChange={
                      setDualMonitors
                    }
                  />

                  <SettingToggle
                    label="Automatically enter full screen"
                    description="Enter full screen when screen sharing."
                    checked={
                      autoFullscreen
                    }
                    onChange={
                      setAutoFullscreen
                    }
                  />

                  <SettingToggle
                    label="Always show meeting controls"
                    description="Keep the meeting toolbar visible."
                    checked={
                      alwaysShowControls
                    }
                    onChange={
                      setAlwaysShowControls
                    }
                  />

                </div>

              </div>
            )}

          </div>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-gray-50">

          <button
            onClick={handleClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0E71EB] hover:bg-[#0c63cf] rounded-xl shadow-sm transition"
          >
            Done
          </button>

        </div>

      </div>

    </div>
  );
};


/* ============================================================
   TOGGLE
============================================================ */

const SettingToggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (
    value: boolean
  ) => void;
}> = ({
  label,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-5 py-3 border-b border-gray-100 last:border-b-0">

      <div className="min-w-0">

        <div className="text-xs font-semibold text-gray-800">
          {label}
        </div>

        {description && (
          <div className="text-[11px] text-gray-500 mt-0.5">
            {description}
          </div>
        )}

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() =>
          onChange(!checked)
        }
        className={`relative shrink-0 w-10 h-5.5 rounded-full transition ${
          checked
            ? "bg-[#0E71EB]"
            : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
            checked
              ? "left-[21px]"
              : "left-[3px]"
          }`}
        />
      </button>

    </div>
  );
};


/* ============================================================
   CAMERA ICON
============================================================ */

const VideoOffIcon = () => {
  return (
    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
      <Video className="w-5 h-5 text-gray-300" />
    </div>
  );
};