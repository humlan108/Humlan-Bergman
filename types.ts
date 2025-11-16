
export enum Tab {
  CREATE_IMAGE = 'Create Image',
  EDIT_IMAGE = 'Edit Image',
  ANALYZE_IMAGE = 'Analyze Image',
  CREATE_VIDEO = 'Create Video',
  ANALYZE_VIDEO = 'Analyze Video',
  GENERATE_SPEECH = 'Generate Speech',
  CHAT_ASSISTANT = 'Chat Assistant',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
