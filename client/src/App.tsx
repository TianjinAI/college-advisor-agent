import { useEffect, useState } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ChatPanel from './components/ChatPanel';
import SchoolDirectory from './components/SchoolDirectory';
import type { StudentProfile, ChatMessage, SchoolSelection } from './types';

const defaultProfile: StudentProfile = {
  gpa: '',
  gpa_scale: 'Weighted',
  ap_ib_classes: '',
  sat_score: '',
  act_score: '',
  class_rank: '',
  interests: '',
  intended_majors: '',
  budget: '',
  target_states: '',
  extracurriculars: '',
  awards_honors: '',
  hooks: [],
  school_type: '',
};

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSelection | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error(`Failed to load models: ${response.status}`);
        }

        const data = (await response.json()) as { models?: string[]; default?: string };
        const models = data.models?.length ? data.models : [];
        const selected = data.default || models[0] || '';

        if (!isMounted) return;

        setAvailableModels(models);
        setCurrentModel(selected);
      } catch (error) {
        console.error('[Models] Failed to load:', error);
        if (!isMounted) return;
        setAvailableModels([]);
        setCurrentModel('');
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

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
            selectedSchool={selectedSchool}
            availableModels={availableModels}
            currentModel={currentModel}
            onModelChange={setCurrentModel}
            isLoadingModels={isLoadingModels}
          />
        </main>
        <SchoolDirectory
          onSelectSchool={(name) => setSelectedSchool({ name, nonce: Date.now() })}
        />
      </div>
    </div>
  );
}
