'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { User, Mail, Phone, Calendar, Ruler, Weight, UserCircle, Save, CheckCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        age: user.age?.toString() || '',
        gender: user.gender || '',
        weight: user.weight?.toString() || '',
        height: user.height?.toString() || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await authApi.updateProfile({
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
      });
      
      setUser(res.data.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(139,92,246,0.03)] to-transparent">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <UserCircle size={24} className="text-purple-400" />
          My Profile
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage your personal and health information.
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white mb-4">Personal Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} /> Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-2 opacity-60">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-white outline-none cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Phone size={14} /> Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} /> Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Years"
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} /> Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors appearance-none"
                >
                  <option value="" className="bg-[#0f111a]">Select Gender</option>
                  <option value="Male" className="bg-[#0f111a]">Male</option>
                  <option value="Female" className="bg-[#0f111a]">Female</option>
                  <option value="Non-binary" className="bg-[#0f111a]">Non-binary</option>
                  <option value="Other" className="bg-[#0f111a]">Other</option>
                  <option value="Prefer not to say" className="bg-[#0f111a]">Prefer not to say</option>
                </select>
              </div>

              {/* Empty space for grid alignment if needed */}
              <div></div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white mb-4">Physical Metrics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weight */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Weight size={14} /> Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="e.g. 70.5"
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Ruler size={14} /> Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="e.g. 175"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-w-[140px] flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : success ? (
                <CheckCircle size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
            </button>

            {error && <p className="text-sm text-red-400 animate-shake">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
