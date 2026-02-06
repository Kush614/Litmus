import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";

const MODELS = {
  NATIVE_AUDIO: "gemini-2.5-flash-native-audio-preview-12-2025",
} as const;

export type LiveSessionMessage =
  | { type: "audio"; data: Buffer; mimeType: string }
  | { type: "input_transcript"; text: string }
  | { type: "output_transcript"; text: string };

export type MessageHandler = (msg: LiveSessionMessage) => void;

export async function createLiveSession(
  apiKey: string,
  systemPrompt: string,
  onMessage: MessageHandler
) {
  const ai = new GoogleGenAI({ apiKey });

  const session = await ai.live.connect({
    model: MODELS.NATIVE_AUDIO,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemPrompt,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore",
          },
        },
      },
    },
    callbacks: {
      onmessage(msg: LiveServerMessage) {
        const serverContent = msg.serverContent;
        if (!serverContent) return;

        // Audio response from Gemini (PCM 24kHz)
        if (serverContent.modelTurn?.parts) {
          for (const part of serverContent.modelTurn.parts) {
            if (part.inlineData) {
              onMessage({
                type: "audio",
                data: Buffer.from(part.inlineData.data!, "base64"),
                mimeType: part.inlineData.mimeType!,
              });
            }
          }
        }

        // Input transcription (what the user said)
        const inputTranscription = serverContent as {
          inputTranscription?: { text: string };
        };
        if (inputTranscription.inputTranscription?.text) {
          onMessage({
            type: "input_transcript",
            text: inputTranscription.inputTranscription.text,
          });
        }

        // Output transcription (what the agent said)
        const outputTranscription = serverContent as {
          outputTranscription?: { text: string };
        };
        if (outputTranscription.outputTranscription?.text) {
          onMessage({
            type: "output_transcript",
            text: outputTranscription.outputTranscription.text,
          });
        }
      },
    },
  });

  return session;
}

export async function sendAudioChunk(
  session: Awaited<ReturnType<typeof createLiveSession>>,
  pcm16kBuffer: Buffer
): Promise<void> {
  await session.sendRealtimeInput({
    audio: {
      data: pcm16kBuffer.toString("base64"),
      mimeType: "audio/pcm;rate=16000",
    },
  });
}
