import { useState } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ChatPanel from './components/ChatPanel';
import type { StudentProfile, ChatMessage } from './types';

const defaultProfile: StudentProfile = {
  gpa: '',
  sat_act: '',
  interests: '',
  budget: '',
  target_states: '',
  extracurriculars: '',
};

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  return (
    <div className="app-container">
      <Header />
      <div className="app-body">
        <aside className="sidebar">
          <ProfileCard profile={profile} onProfileChange={setProfile} />
        </aside>
        <main className="main-content">
          <ChatPanel
            messages={messages}
            setMessages={setMessages}
            profile={profile}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
          />
        </main>
      </div>
    </div>
  );
}
