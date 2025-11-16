
import { GoogleGenAI, Modality, Chat, GenerateContentResponse, Type } from "@google/genai";
import type { GenerateVideosOperationResponse, VideoGenerationReferenceImage, VideoGenerationReferenceType, GroundingChunk } from "@google/genai";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });
  return response.generatedImages[0].image.imageBytes;
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<{ data: string, mimeType: string }> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: prompt },
      ],
    },
    config: { responseModalities: [Modality.IMAGE] },
  });
  const firstPart = response.candidates?.[0]?.content?.parts[0];
  if (firstPart && 'inlineData' in firstPart && firstPart.inlineData?.data && firstPart.inlineData?.mimeType) {
    return { data: firstPart.inlineData.data, mimeType: firstPart.inlineData.mimeType };
  }
  throw new Error("No image generated from edit.");
};

export const analyzeImage = async (imageBase64: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: "Analyze this image in detail. Describe the objects, scene, colors, and any potential context or meaning." },
      ],
    },
  });
  return response.text;
};

export const generateVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  imageBase64?: string,
  mimeType?: string,
  onProgress?: (message: string) => void
): Promise<string> => {
  const ai = getAiClient();
  
  const requestPayload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
  };

  if(imageBase64 && mimeType) {
    requestPayload.image = {
        imageBytes: imageBase64,
        mimeType: mimeType
    }
  }

  onProgress?.("Initiating video generation...");
  let operation = await ai.models.generateVideos(requestPayload);

  onProgress?.("Processing... This may take a few minutes.");
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    const progressPercent = operation.metadata?.progressPercentage;
    if(progressPercent) {
        onProgress?.(`Processing... ${progressPercent.toFixed(0)}% complete.`);
    } else {
        onProgress?.("Still processing... please wait.");
    }
  }

  onProgress?.("Finalizing video...");
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation failed or returned no URI.");
  }

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if(!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const videoBlob = await response.blob();
  return URL.createObjectURL(videoBlob);
};


export const analyzeVideo = async (frames: string[]): Promise<string> => {
    const ai = getAiClient();
    const imageParts = frames.map(frame => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: frame
        }
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { text: "Analyze these video frames sequentially and provide a summary of the events, objects, and actions occurring in the video. What is the overall story or activity depicted?" },
                ...imageParts
            ]
        },
        config: {
            temperature: 0.2
        }
    });

    return response.text;
};


export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with a clear and friendly voice: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Speech generation failed.");
    }
    return base64Audio;
};


export const createChatSession = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
        model: 'gemini-2.5-flash-lite',
        config: {
            systemInstruction: "You are an expert prompt engineer for generative AI models. Help users create detailed, ultra-realistic prompts for generating images of models and creative content. Be concise and helpful.",
        }
    });
};