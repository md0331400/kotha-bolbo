import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Spinner, showToast } from '@/components/ui';

export const ProfileScreen = () => {
  const { user, updateDisplayName, updateBio, updateGender, uploadPhoto } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      if (name.trim() !== user?.displayName) await updateDisplayName(name.trim());
      if (bio.trim() !== user?.bio) await updateBio(bio);
      if (gender !== user?.gender) await updateGender(gender);
      showToast('Profile updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image', 'error'); return; }

    setUploading(true);
    try {
      await uploadPhoto(file);
      showToast('Photo updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: '#0a0e1a' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 safe-top flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Profile
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
        >
          {saving ? <Spinner size={16} /> : 'Save'}
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar user={user} size={100} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}
              disabled={uploading}
            >
              {uploading ? (
                <Spinner size={16} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Tap to change photo</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium ml-1">Full Name</label>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-[15px]"
              placeholder="Your name"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium ml-1">Email</label>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[15px] text-gray-400">{user.email}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium ml-1">Bio</label>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-[15px] resize-none"
              rows={3}
              placeholder="Tell us about yourself"
              maxLength={150}
            />
          </div>
          <p className="text-xs text-gray-600 text-right">{bio.length}/150</p>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium ml-1">Gender</label>
          <div className="flex gap-2">
            {['Male', 'Female', 'Other'].map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: gender === g ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.05)',
                  border: gender === g ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  color: gender === g ? 'white' : 'rgba(255,255,255,0.5)',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
