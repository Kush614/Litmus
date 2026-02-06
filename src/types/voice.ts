import type { TranscriptEntry } from "./evaluation";

export type PlivoStartEvent = {
  event: "start";
  start: {
    streamId: string;
    callId: string;
    accountId: string;
    from: string;
    to: string;
    codec: string;
  };
};

export type PlivoMediaEvent = {
  event: "media";
  media: {
    contentType: string;
    sampleRate: number;
    payload: string;
    timestamp: string;
  };
  streamId: string;
};

export type PlivoPlayAudioEvent = {
  event: "playAudio";
  media: {
    contentType: "audio/x-mulaw";
    sampleRate: 8000;
    payload: string;
  };
};

export type PlivoClearAudioEvent = {
  event: "clearAudio";
  streamId: string;
};

export type PlivoStopEvent = {
  event: "stop";
  streamId: string;
};

export type PlivoEvent = PlivoStartEvent | PlivoMediaEvent | PlivoStopEvent;

export type VoiceEvalScores = {
  naturalness: number;
  helpfulness: number;
  latency: number;
  accuracy: number;
  tone: number;
};

export type VoiceCallState = {
  call_uuid: string;
  stream_id: string | undefined;
  agent_id: string;
  status:
    | "initiating"
    | "ringing"
    | "connected"
    | "streaming"
    | "evaluating"
    | "complete"
    | "failed";
  transcript: TranscriptEntry[];
};
