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
          <div className="sidebar-copy">
            <p className="eyebrow">Student Snapshot</p>
            <h2>Give the advisor enough context to filter for fit, affordability, and admissions odds.</h2>
            <p>
              Keep this lightweight. Even partial inputs help the recommendations lean on the loaded school
              profiles and admissions insights.
            </p>
          </div>
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
