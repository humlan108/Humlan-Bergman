
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tab, ChatMessage } from './types';
import * as geminiService from './services/geminiService';
import { fileToBase64, decode, decodeAudioData, extractVideoFrames } from './utils/media';
import Spinner from './components/Spinner';
import FileUploader from './components/FileUploader';
// FIX: Aliased `ChatAssistant` icon import to `ChatAssistantIcon` to resolve the naming conflict with the `ChatAssistant` component.
import { CreateImage, EditImage, AnalyzeImage, CreateVideo, AnalyzeVideo, GenerateSpeech, ChatAssistant as ChatAssistantIcon, Download } from './components/Icons';
import type { Chat } from '@google/genai';

const TABS = [
  { id: Tab.CREATE_IMAGE, icon: CreateImage },
  { id: Tab.EDIT_IMAGE, icon: EditImage },
  { id: Tab.ANALYZE_IMAGE, icon: AnalyzeImage },
  { id: Tab.CREATE_VIDEO, icon: CreateVideo },
  { id: Tab.ANALYZE_VIDEO, icon: AnalyzeVideo },
  { id: Tab.GENERATE_SPEECH, icon: GenerateSpeech },
  // FIX: Used the aliased icon `ChatAssistantIcon` to fix the "used before its declaration" error.
  { id: Tab.CHAT_ASSISTANT, icon: ChatAssistantIcon },
];

const sharedButtonClasses = "w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors";
const sharedInputClasses = "w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-cyan-500 focus:border-cyan-500 transition";
const sharedCardClasses = "bg-gray-800 p-6 rounded-xl shadow-lg";

// Feature Components
const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError('');
    setGeneratedImage(null);
    try {
      const imageBytes = await geminiService.generateImage(prompt);
      setGeneratedImage(`data:image/jpeg;base64,${imageBytes}`);
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const filename = `ai-canvas-${Date.now()}.jpeg`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={sharedCardClasses}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-cyan-400">Generate Image with Imagen 4</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A robot holding a red skateboard."
          className={`${sharedInputClasses} min-h-[100px]`}
          rows={3}
        />
        <button onClick={handleGenerate} disabled={isLoading} className={sharedButtonClasses}>
          {isLoading ? <Spinner /> : 'Generate'}
        </button>
        {error && <p className="text-red-400 text-center">{error}</p>}
        {generatedImage && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg space-y-4">
            <img src={generatedImage} alt="Generated" className="rounded-lg mx-auto max-w-full max-h-[60vh] object-contain" />
            <button onClick={handleDownload} className={`${sharedButtonClasses} max-w-xs mx-auto`}>
              <Download />
              Download Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ImageEditor = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setOriginalImage(URL.createObjectURL(selectedFile));
        setEditedImage(null);
    };

    const handleEdit = async () => {
        if (!file || !prompt) {
            setError('Please upload an image and enter an editing prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setEditedImage(null);
        try {
            const { base64, mimeType } = await fileToBase64(file);
            const { data: editedImageBytes, mimeType: editedMimeType } = await geminiService.editImage(prompt, base64, mimeType);
            setEditedImage(`data:${editedMimeType};base64,${editedImageBytes}`);
        } catch (e: any) {
            setError(e.message);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!editedImage || !file) return;
        const link = document.createElement('a');
        link.href = editedImage;

        const originalFilename = file.name.substring(0, file.name.lastIndexOf('.') || file.name.length);
        const mimeType = editedImage.substring(editedImage.indexOf(':') + 1, editedImage.indexOf(';'));
        const extension = mimeType.split('/')[1] || 'png';
        
        link.download = `${originalFilename}-edited-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={sharedCardClasses}>
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-cyan-400">Edit Image with Nano Banana</h2>
                <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload an image to edit" />
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Add a retro filter, remove the person in the background"
                    className={`${sharedInputClasses} min-h-[60px]`}
                    rows={2}
                />
                <button onClick={handleEdit} disabled={isLoading || !file} className={sharedButtonClasses}>
                    {isLoading ? <Spinner /> : 'Apply Edit'}
                </button>
                {error && <p className="text-red-400 text-center">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {originalImage && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-center">Original</h3>
                            <img src={originalImage} alt="Original" className="rounded-lg w-full object-contain" />
                        </div>
                    )}
                    {editedImage && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-center">Edited</h3>
                                <img src={editedImage} alt="Edited" className="rounded-lg w-full object-contain" />
                            </div>
                            <button onClick={handleDownload} className={`${sharedButtonClasses} max-w-xs mx-auto`}>
                                <Download />
                                Download Edited Image
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ImageAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload an image to analyze.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const result = await geminiService.analyzeImage(base64, mimeType);
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={sharedCardClasses}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-cyan-400">Analyze Image with Gemini Flash</h2>
        <FileUploader onFileSelect={setFile} accept="image/*" label="Upload image for analysis" />
        <button onClick={handleAnalyze} disabled={isLoading || !file} className={sharedButtonClasses}>
          {isLoading ? <Spinner /> : 'Analyze'}
        </button>
        {error && <p className="text-red-400 text-center">{error}</p>}
        {analysis && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg whitespace-pre-wrap">
            <h3 className="font-semibold mb-2 text-cyan-300">Analysis Result:</h3>
            <p>{analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
};


const VideoGenerator = () => {
    const [apiKeyReady, setApiKeyReady] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const checkApiKey = useCallback(async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setApiKeyReady(true);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);
    
    const handleSelectKey = async () => {
        if(window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race condition and re-check
            setApiKeyReady(true);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && !file) {
            setError('Please enter a prompt or upload a starting image.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedVideoUrl(null);
        
        try {
            let imagePayload: { base64?: string; mimeType?: string } = {};
            if(file) {
                const { base64, mimeType } = await fileToBase64(file);
                imagePayload = { base64, mimeType };
            }
            const url = await geminiService.generateVideo(
                prompt,
                aspectRatio,
                imagePayload.base64,
                imagePayload.mimeType,
                setLoadingMessage
            );
            setGeneratedVideoUrl(url);
        } catch (e: any) {
             const errorMessage = e.message || 'An unknown error occurred.';
            setError(errorMessage);
            if(errorMessage.includes("Requested entity was not found")) {
                setError("API Key error. Please re-select your API key.");
                setApiKeyReady(false);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    if (!apiKeyReady) {
        return (
            <div className={`${sharedCardClasses} text-center`}>
                <h2 className="text-xl font-bold text-cyan-400 mb-4">Veo Video Generation</h2>
                <p className="mb-4 text-gray-300">This feature requires an API key with access to Veo models. Please select your API key to proceed.</p>
                <p className="mb-6 text-sm text-gray-400">Ensure your project is set up for billing. For more info, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Gemini API Billing</a>.</p>
                <button onClick={handleSelectKey} className={sharedButtonClasses}>
                    Select API Key
                </button>
                 {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
        );
    }

    return (
        <div className={sharedCardClasses}>
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-cyan-400">Generate Video with Veo</h2>
                <p className="text-sm text-gray-400">Animate an image or create a video from a text prompt.</p>
                <FileUploader onFileSelect={setFile} accept="image/*" label="Upload a starting image (optional)" />
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A neon hologram of a cat driving at top speed"
                    className={`${sharedInputClasses} min-h-[100px]`}
                    rows={3}
                />
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">Aspect Ratio:</span>
                    <div className="flex gap-4">
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="form-radio text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                            <span>16:9 (Landscape)</span>
                        </label>
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="aspectRatio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="form-radio text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-500"/>
                            <span>9:16 (Portrait)</span>
                        </label>
                    </div>
                </div>
                <button onClick={handleGenerate} disabled={isLoading} className={sharedButtonClasses}>
                    {isLoading ? <Spinner /> : 'Generate Video'}
                </button>
                {isLoading && <p className="text-cyan-300 text-center animate-pulse">{loadingMessage}</p>}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {generatedVideoUrl && (
                    <div className="mt-4 p-2 bg-gray-900 rounded-lg">
                        <video src={generatedVideoUrl} controls autoPlay loop className="rounded-lg mx-auto w-full max-h-[60vh]" />
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoAnalyzer = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [analysis, setAnalysis] = useState<string | null>(null);
    
    const handleAnalyze = async () => {
        if (!file) {
            setError('Please upload a video to analyze.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAnalysis(null);
        setProgress(0);
        try {
            const frames = await extractVideoFrames(file, 1, setProgress);
            const result = await geminiService.analyzeVideo(frames);
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={sharedCardClasses}>
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-cyan-400">Analyze Video with Gemini Pro</h2>
                <FileUploader onFileSelect={setFile} accept="video/*" label="Upload video for analysis" />
                 {isLoading && (
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        <p className="text-center text-sm mt-1">{progress > 0 ? `Extracting frames: ${progress}%` : 'Preparing video...'}</p>
                    </div>
                 )}
                <button onClick={handleAnalyze} disabled={isLoading || !file} className={sharedButtonClasses}>
                    {isLoading ? <Spinner /> : 'Analyze Video'}
                </button>
                {error && <p className="text-red-400 text-center">{error}</p>}
                {analysis && (
                    <div className="mt-4 p-4 bg-gray-900 rounded-lg whitespace-pre-wrap">
                        <h3 className="font-semibold mb-2 text-cyan-300">Analysis Result:</h3>
                        <p>{analysis}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SpeechGenerator = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Create AudioContext on user interaction to comply with browser policies
        const initAudioContext = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            window.removeEventListener('click', initAudioContext);
        };
        window.addEventListener('click', initAudioContext);
        return () => window.removeEventListener('click', initAudioContext);
    }, []);
    
    const handleGenerate = async () => {
        if (!text) {
            setError('Please enter text to generate speech.');
            return;
        }
        if(!audioContextRef.current) {
            setError('Audio context not available. Please click anywhere on the page first.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAudioUrl(null);
        try {
            const base64Audio = await geminiService.generateSpeech(text);
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);

            const blob = new Blob([audioBytes], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className={sharedCardClasses}>
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-cyan-400">Generate Speech with TTS</h2>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to convert to speech..."
                    className={`${sharedInputClasses} min-h-[120px]`}
                    rows={4}
                />
                <button onClick={handleGenerate} disabled={isLoading} className={sharedButtonClasses}>
                    {isLoading ? <Spinner /> : 'Generate Speech'}
                </button>
                {error && <p className="text-red-400 text-center">{error}</p>}
                {audioUrl && (
                    <div className="mt-4">
                        <audio controls src={audioUrl} className="w-full" />
                    </div>
                )}
            </div>
        </div>
    );
};


const ChatAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = geminiService.createChatSession();
    setMessages([{role: 'model', text: 'Hello! I am your prompt engineering assistant. How can I help you create better AI prompts today?'}]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        if (chatRef.current) {
            const response = await chatRef.current.sendMessage({ message: input });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        }
    } catch (e: any) {
        const errorMessage: ChatMessage = { role: 'model', text: `Sorry, an error occurred: ${e.message}` };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className={`${sharedCardClasses} flex flex-col h-[75vh]`}>
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex-shrink-0">Prompt Assistant (Flash-Lite)</h2>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 bg-gray-900 p-4 rounded-lg">
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
             {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-200 px-4 py-2 rounded-2xl"><Spinner/></div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        <div className="mt-4 flex-shrink-0 flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for prompt ideas..."
                className={sharedInputClasses}
                disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className={`${sharedButtonClasses} w-auto px-6`}>
                Send
            </button>
        </div>
    </div>
  );
};


// Main App Component
const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CREATE_IMAGE);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.CREATE_IMAGE:
        return <ImageGenerator />;
      case Tab.EDIT_IMAGE:
        return <ImageEditor />;
      case Tab.ANALYZE_IMAGE:
        return <ImageAnalyzer />;
      case Tab.CREATE_VIDEO:
        return <VideoGenerator />;
      case Tab.ANALYZE_VIDEO:
        return <VideoAnalyzer />;
      case Tab.GENERATE_SPEECH:
        return <SpeechGenerator />;
      case Tab.CHAT_ASSISTANT:
        return <ChatAssistant />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-center text-cyan-400 tracking-wider">AI Canvas Studio</h1>
        </div>
        <nav className="flex items-center justify-center border-t border-gray-700">
           <div className="flex space-x-1 p-1 overflow-x-auto">
             {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center text-sm font-medium px-4 py-2 rounded-full whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon />
                {tab.id}
              </button>
            ))}
           </div>
        </nav>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;