# PRP-3.4: Profile Management & Family Controls

## Purpose & Core Philosophy

**Create comprehensive family-centric profile system that enables personalized media experiences while maintaining parental control and content safety across all family members.**

### Before implementing profiles, ask:

- **Does this profile system protect children while empowering parents?**
- **How does profile switching enhance rather than complicate the user experience?**
- **Will content filtering feel protective rather than restrictive?**
- **Does the system scale from single users to large families?**

### Core Principles

1. **Child Safety First**: All profile features prioritize child protection over convenience
2. **Seamless Family Switching**: Profile changes should be instant and contextually aware
3. **Granular Content Control**: Parents control exactly what each family member can access
4. **Privacy-Respecting Design**: Each profile maintains independent viewing history and preferences
5. **Intuitive Age-Appropriate UI**: Interface adapts to match profile age and capabilities

---

## Gap Analysis: Current vs Family-Centric Profile System

### Current State Issues

- **Basic Authentication Only**: Generic login system without family member differentiation
- **No Content Filtering**: All users see same content regardless of age or preferences
- **Missing Parental Controls**: No way for parents to manage what children can access
- **Single User Experience**: Interface doesn't adapt based on who's using it
- **No Viewing History Separation**: All family members share same watch history and recommendations
- **Static Preferences**: No way to customize experience per family member
- **Missing Safety Features**: No time limits, content blocking, or usage monitoring

### Family-Centric Target Experience

- **Visual Profile Selection**: Avatar-based profile switching like Netflix Kids profiles
- **Age-Appropriate Content Filtering**: Automatic content filtering based on profile age settings
- **Comprehensive Parental Dashboard**: Usage monitoring, time limits, content approval workflows
- **Smart Profile Detection**: System suggests profile switching based on viewing patterns
- **Personalized Experiences**: Themes, recommendations, and UI adapt to each profile
- **Safety-First Design**: All interactions designed around child protection and family harmony
- **Flexible Family Structure**: Support for various family compositions and shared devices

---

## Implementation Strategy

### 1. Profile Data Architecture (`ProfileTypes`)

**Philosophy**: Profile system should be flexible enough to handle diverse family structures while maintaining strict safety controls.

```tsx
// /frontend/src/types/profile.ts
export interface UserProfile {
  id: string;
  name: string;
  displayName: string;
  avatar: ProfileAvatar;
  dateCreated: Date;
  lastActive: Date;
  isActive: boolean;

  // Age and Safety
  dateOfBirth?: Date;
  ageGroup: AgeGroup;
  isChild: boolean;
  isParent: boolean;
  isAdmin: boolean;

  // Content Restrictions
  contentRating: ContentRating;
  restrictions: ContentRestrictions;
  allowedCategories: string[];
  blockedContent: BlockedContent[];

  // Viewing Preferences
  preferences: ViewingPreferences;
  watchHistory: WatchHistoryEntry[];
  watchlist: string[];
  favorites: string[];
  continueWatching: ContinueWatchingEntry[];

  // Parental Controls
  parentalControls?: ParentalControls;
  supervisedBy?: string; // Parent profile ID
  childProfiles?: string[]; // IDs of managed child profiles

  // Usage and Limits
  usageStats: UsageStatistics;
  timeLimits?: TimeLimits;
  scheduleRestrictions?: ScheduleRestrictions;

  // Personalization
  themePreference?: string;
  languagePreference: string;
  accessibilitySettings: AccessibilitySettings;
  notificationSettings: NotificationSettings;
}

export enum AgeGroup {
  Toddler = 'toddler', // 2-4 years
  Preschool = 'preschool', // 4-6 years
  Elementary = 'elementary', // 6-12 years
  Teen = 'teen', // 13-17 years
  Adult = 'adult', // 18+ years
}

export enum ContentRating {
  G = 'G', // General Audiences
  PG = 'PG', // Parental Guidance
  PG13 = 'PG-13', // Parents Strongly Cautioned
  R = 'R', // Restricted
  NC17 = 'NC-17', // Adults Only
}

export interface ContentRestrictions {
  maxContentRating: ContentRating;
  blockedKeywords: string[];
  blockedChannels: string[];
  allowedDomains?: string[]; // For YouTube content
  requireApproval: boolean;
  hideAdultContent: boolean;
  filterProfanity: boolean;
}

export interface ParentalControls {
  pinRequired: boolean;
  pin?: string;
  canModifyProfiles: boolean;
  canAccessAdminFeatures: boolean;
  canApproveContent: boolean;
  canSetTimeLimits: boolean;
  canViewAllHistory: boolean;
  receiveUsageReports: boolean;
}

export interface TimeLimits {
  dailyLimitMinutes?: number;
  weeklyLimitMinutes?: number;
  sessionLimitMinutes?: number;
  bedtimeEnabled: boolean;
  bedtimeStart?: string; // HH:mm format
  bedtimeEnd?: string;
  weekendDifferentLimits: boolean;
  weekendDailyLimit?: number;
}

export interface UsageStatistics {
  totalWatchTimeMinutes: number;
  sessionsToday: number;
  averageSessionLength: number;
  favoriteCategories: CategoryUsage[];
  peakUsageHours: number[];
  weeklyUsage: DailyUsage[];
  monthlyUsage: MonthlyUsage[];
}

export interface ProfileAvatar {
  type: 'preset' | 'uploaded' | 'generated';
  imageUrl: string;
  backgroundColor: string;
  iconName?: string; // For preset avatars
  isCustom: boolean;
}
```

### 2. Profile Selection Interface (`ProfileSelector`)

**Philosophy**: Profile selection should be visually engaging and instantly recognizable, especially for children who may not read fluently.

```tsx
// /frontend/src/components/ProfileSelector/ProfileSelector.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AgeGroup } from '../../types';
import { useProfiles } from '../../hooks/useProfiles';
import { ProfileCard } from './ProfileCard';
import { AddProfileDialog } from './AddProfileDialog';
import { ParentalPinDialog } from './ParentalPinDialog';
import { ProfileUsageWarning } from './ProfileUsageWarning';
import './ProfileSelector.css';

interface ProfileSelectorProps {
  isOpen: boolean;
  onProfileSelect: (profile: UserProfile) => void;
  onClose: () => void;
  currentProfile?: UserProfile;
  showAddProfile?: boolean;
  compact?: boolean;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  isOpen,
  onProfileSelect,
  onClose,
  currentProfile,
  showAddProfile = true,
  compact = false,
}) => {
  const { profiles, addProfile, updateProfile, deleteProfile } = useProfiles();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [usageWarning, setUsageWarning] = useState<UserProfile | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Group profiles by type
  const adultProfiles = profiles.filter(p => p.ageGroup === AgeGroup.Adult);
  const childProfiles = profiles.filter(p => p.ageGroup !== AgeGroup.Adult);

  // Handle profile selection with safety checks
  const handleProfileSelect = useCallback(
    async (profile: UserProfile) => {
      // Check if switching from child profile requires PIN
      if (currentProfile?.isChild && !profile.isChild) {
        setSelectedProfile(profile);
        setShowPinDialog(true);
        return;
      }

      // Check usage limits for child profiles
      if (profile.isChild && profile.timeLimits) {
        const usageToday = profile.usageStats.sessionsToday;
        const dailyLimit = profile.timeLimits.dailyLimitMinutes;

        if (dailyLimit && usageToday >= dailyLimit) {
          setUsageWarning(profile);
          return;
        }

        // Check bedtime restrictions
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        if (profile.timeLimits.bedtimeEnabled && profile.timeLimits.bedtimeStart && profile.timeLimits.bedtimeEnd) {
          const bedtimeStart = profile.timeLimits.bedtimeStart;
          const bedtimeEnd = profile.timeLimits.bedtimeEnd;

          if (isWithinBedtime(currentTime, bedtimeStart, bedtimeEnd)) {
            setUsageWarning(profile);
            return;
          }
        }
      }

      // Safe to switch profiles
      await switchToProfile(profile);
    },
    [currentProfile]
  );

  const switchToProfile = useCallback(
    async (profile: UserProfile) => {
      try {
        // Update last active timestamp
        await updateProfile(profile.id, {
          lastActive: new Date(),
        });

        onProfileSelect(profile);
        onClose();
      } catch (error) {
        console.error('Failed to switch profiles:', error);
      }
    },
    [updateProfile, onProfileSelect, onClose]
  );

  // Handle PIN verification
  const handlePinVerified = useCallback(() => {
    if (selectedProfile) {
      switchToProfile(selectedProfile);
    }
    setShowPinDialog(false);
    setSelectedProfile(null);
  }, [selectedProfile, switchToProfile]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className={`profile-selector ${compact ? 'profile-selector--compact' : ''}`}
      ref={selectorRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-labelledby="profile-selector-title"
    >
      <div className="profile-selector__backdrop" onClick={onClose} />

      <div className="profile-selector__content">
        <header className="profile-selector__header">
          <h1 id="profile-selector-title">Who's watching?</h1>
          <button className="close-button" onClick={onClose} aria-label="Close profile selector">
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>

        <div className="profile-selector__profiles">
          {/* Adult Profiles Section */}
          {adultProfiles.length > 0 && (
            <section className="profile-section">
              <h2 className="section-title">Adults</h2>
              <div className="profile-grid">
                {adultProfiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isSelected={currentProfile?.id === profile.id}
                    onClick={() => handleProfileSelect(profile)}
                    showUsageInfo={false}
                    size={compact ? 'small' : 'medium'}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Children's Profiles Section */}
          {childProfiles.length > 0 && (
            <section className="profile-section">
              <h2 className="section-title">
                <svg className="kids-icon" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 3.5C14.8 3.4 14.6 3.3 14.4 3.3L13.6 3.8C13.2 4.1 12.8 4.1 12.4 3.8L11.6 3.3C11.4 3.3 11.2 3.4 11 3.5L5 7V9H7V20C7 21.1 7.9 22 9 22H11V16H13V22H15C16.1 22 17 21.1 17 20V9H21Z" />
                </svg>
                Kids
              </h2>
              <div className="profile-grid profile-grid--kids">
                {childProfiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isSelected={currentProfile?.id === profile.id}
                    onClick={() => handleProfileSelect(profile)}
                    showUsageInfo={true}
                    size={compact ? 'small' : 'large'}
                    variant="kid"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add Profile Button */}
          {showAddProfile && (
            <div className="add-profile-section">
              <button
                className="add-profile-button"
                onClick={() => setShowAddDialog(true)}
                aria-label="Add new profile"
              >
                <div className="add-profile-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </div>
                <span className="add-profile-text">Add Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Management Link */}
        <footer className="profile-selector__footer">
          <button
            className="manage-profiles-button"
            onClick={() => {
              /* Navigate to profile management */
            }}
          >
            Manage Profiles
          </button>
        </footer>
      </div>

      {/* Dialogs */}
      {showAddDialog && (
        <AddProfileDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onProfileCreated={addProfile}
          existingProfiles={profiles}
        />
      )}

      {showPinDialog && (
        <ParentalPinDialog
          isOpen={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          onSuccess={handlePinVerified}
          profile={selectedProfile}
        />
      )}

      {usageWarning && (
        <ProfileUsageWarning
          isOpen={!!usageWarning}
          profile={usageWarning}
          onClose={() => setUsageWarning(null)}
          onOverride={() => {
            switchToProfile(usageWarning);
            setUsageWarning(null);
          }}
        />
      )}
    </div>
  );
};

// Utility function
function isWithinBedtime(currentTime: string, bedtimeStart: string, bedtimeEnd: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(bedtimeStart);
  const end = timeToMinutes(bedtimeEnd);

  // Handle overnight bedtime (e.g., 20:00 to 07:00)
  if (start > end) {
    return current >= start || current <= end;
  }

  return current >= start && current <= end;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
```

### 3. Profile Card Component (`ProfileCard`)

**Philosophy**: Profile cards should be immediately recognizable and provide appropriate visual feedback for different user types.

```tsx
// /frontend/src/components/ProfileSelector/ProfileCard.tsx
import React, { memo } from 'react';
import { UserProfile, AgeGroup } from '../../types';
import { ProfileAvatar } from './ProfileAvatar';
import { UsageMeter } from './UsageMeter';
import './ProfileCard.css';

interface ProfileCardProps {
  profile: UserProfile;
  isSelected?: boolean;
  onClick: () => void;
  showUsageInfo?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'kid';
  disabled?: boolean;
}

export const ProfileCard = memo<ProfileCardProps>(
  ({
    profile,
    isSelected = false,
    onClick,
    showUsageInfo = false,
    size = 'medium',
    variant = 'default',
    disabled = false,
  }) => {
    const isKidsProfile = profile.ageGroup !== AgeGroup.Adult;
    const hasUsageLimits =
      profile.timeLimits && (profile.timeLimits.dailyLimitMinutes || profile.timeLimits.sessionLimitMinutes);

    const cardClasses = [
      'profile-card',
      `profile-card--${size}`,
      `profile-card--${variant}`,
      isSelected && 'profile-card--selected',
      isKidsProfile && 'profile-card--kid',
      disabled && 'profile-card--disabled',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        className={cardClasses}
        onClick={onClick}
        disabled={disabled}
        aria-label={`Switch to ${profile.displayName}'s profile`}
        data-profile-id={profile.id}
      >
        {/* Avatar */}
        <div className="profile-card__avatar">
          <ProfileAvatar
            avatar={profile.avatar}
            size={size === 'large' ? 'xl' : size === 'small' ? 'sm' : 'lg'}
            isActive={isSelected}
          />

          {/* Online indicator */}
          {profile.isActive && <div className="profile-card__online-indicator" aria-hidden="true" />}

          {/* Age group indicator for kids */}
          {isKidsProfile && (
            <div className="profile-card__age-badge">
              <svg viewBox="0 0 24 24" className="age-icon">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 3.5C14.8 3.4 14.6 3.3 14.4 3.3L13.6 3.8C13.2 4.1 12.8 4.1 12.4 3.8L11.6 3.3C11.4 3.3 11.2 3.4 11 3.5L5 7V9H7V20C7 21.1 7.9 22 9 22H11V16H13V22H15C16.1 22 17 21.1 17 20V9H21Z" />
              </svg>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="profile-card__info">
          <h3 className="profile-name">{profile.displayName}</h3>

          {/* Age group label for kids */}
          {isKidsProfile && size !== 'small' && (
            <p className="profile-age-label">{getAgeGroupLabel(profile.ageGroup)}</p>
          )}

          {/* Last active */}
          {size === 'large' && (
            <p className="profile-last-active">Last active: {formatLastActive(profile.lastActive)}</p>
          )}
        </div>

        {/* Usage Information */}
        {showUsageInfo && hasUsageLimits && (
          <div className="profile-card__usage">
            <UsageMeter profile={profile} variant={size === 'small' ? 'minimal' : 'full'} />
          </div>
        )}

        {/* Admin badge */}
        {profile.isAdmin && (
          <div className="profile-card__admin-badge">
            <svg viewBox="0 0 24 24">
              <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
            </svg>
            <span className="sr-only">Administrator</span>
          </div>
        )}

        {/* Selection indicator */}
        <div className="profile-card__selection-ring" aria-hidden="true" />
      </button>
    );
  }
);

ProfileCard.displayName = 'ProfileCard';

// Helper functions
function getAgeGroupLabel(ageGroup: AgeGroup): string {
  const labels = {
    [AgeGroup.Toddler]: 'Toddler (2-4)',
    [AgeGroup.Preschool]: 'Preschool (4-6)',
    [AgeGroup.Elementary]: 'Elementary (6-12)',
    [AgeGroup.Teen]: 'Teen (13-17)',
    [AgeGroup.Adult]: 'Adult',
  };

  return labels[ageGroup] || 'Unknown';
}

function formatLastActive(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
```

### 4. Parental Controls Dashboard (`ParentalDashboard`)

**Philosophy**: Parental controls should be comprehensive yet intuitive, empowering parents without overwhelming them with options.

```tsx
// /frontend/src/components/ParentalDashboard/ParentalDashboard.tsx
import React, { useState, useMemo } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import { UserProfile, ContentRating, TimeLimits } from '../../types';
import { ProfileOverviewCard } from './ProfileOverviewCard';
import { ContentFilteringControls } from './ContentFilteringControls';
import { TimeLimitsControls } from './TimeLimitsControls';
import { UsageReportsPanel } from './UsageReportsPanel';
import { ContentApprovalQueue } from './ContentApprovalQueue';
import './ParentalDashboard.css';

interface ParentalDashboardProps {
  parentProfile: UserProfile;
}

export const ParentalDashboard: React.FC<ParentalDashboardProps> = ({ parentProfile }) => {
  const { profiles, updateProfile } = useProfiles();
  const [activeTab, setActiveTab] = useState<'overview' | 'controls' | 'reports' | 'approvals'>('overview');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Get child profiles managed by this parent
  const childProfiles = useMemo(
    () =>
      profiles.filter(
        profile => profile.supervisedBy === parentProfile.id || parentProfile.childProfiles?.includes(profile.id)
      ),
    [profiles, parentProfile.id]
  );

  const selectedChild = selectedChildId ? childProfiles.find(p => p.id === selectedChildId) : childProfiles[0];

  // Handle updating child profile restrictions
  const updateChildRestrictions = async (childId: string, updates: Partial<UserProfile>) => {
    try {
      await updateProfile(childId, updates);
    } catch (error) {
      console.error('Failed to update child restrictions:', error);
    }
  };

  const dashboardTabs = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'controls', label: 'Controls', icon: 'shield' },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'approvals', label: 'Approvals', icon: 'check' },
  ];

  return (
    <div className="parental-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Parental Dashboard</h1>
          <p className="header-subtitle">
            Manage {childProfiles.length} child profile{childProfiles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Child Profile Selector */}
        {childProfiles.length > 1 && (
          <div className="child-selector">
            <label htmlFor="child-select" className="sr-only">
              Select child profile
            </label>
            <select
              id="child-select"
              value={selectedChildId || ''}
              onChange={e => setSelectedChildId(e.target.value)}
              className="child-select"
            >
              {childProfiles.map(child => (
                <option key={child.id} value={child.id}>
                  {child.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav" role="tablist">
        {dashboardTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'nav-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <svg className="tab-icon" viewBox="0 0 24 24">
              {getTabIcon(tab.icon)}
            </svg>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Dashboard Content */}
      <div className="dashboard-content" role="tabpanel">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {childProfiles.map(child => (
              <ProfileOverviewCard
                key={child.id}
                profile={child}
                onManage={() => {
                  setSelectedChildId(child.id);
                  setActiveTab('controls');
                }}
              />
            ))}

            {childProfiles.length === 0 && (
              <div className="empty-state">
                <h3>No child profiles found</h3>
                <p>Create child profiles to manage their content and usage.</p>
                <button className="button button--primary">Create Child Profile</button>
              </div>
            )}
          </div>
        )}

        {/* Controls Tab */}
        {activeTab === 'controls' && selectedChild && (
          <div className="controls-panel">
            <div className="controls-sidebar">
              <h2>{selectedChild.displayName}'s Controls</h2>

              <nav className="controls-nav">
                <a href="#content-filtering" className="control-nav-link">
                  Content Filtering
                </a>
                <a href="#time-limits" className="control-nav-link">
                  Time Limits
                </a>
                <a href="#bedtime" className="control-nav-link">
                  Bedtime Schedule
                </a>
                <a href="#notifications" className="control-nav-link">
                  Notifications
                </a>
              </nav>
            </div>

            <div className="controls-content">
              {/* Content Filtering */}
              <section id="content-filtering" className="control-section">
                <ContentFilteringControls
                  profile={selectedChild}
                  onUpdate={updates => updateChildRestrictions(selectedChild.id, updates)}
                />
              </section>

              {/* Time Limits */}
              <section id="time-limits" className="control-section">
                <TimeLimitsControls
                  profile={selectedChild}
                  onUpdate={(timeLimits: TimeLimits) => updateChildRestrictions(selectedChild.id, { timeLimits })}
                />
              </section>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <UsageReportsPanel
            childProfiles={childProfiles}
            selectedChildId={selectedChildId}
            onChildSelect={setSelectedChildId}
          />
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <ContentApprovalQueue parentProfile={parentProfile} childProfiles={childProfiles} />
        )}
      </div>
    </div>
  );
};

function getTabIcon(iconName: string): React.ReactNode {
  const icons = {
    home: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    shield: (
      <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" />
    ),
    chart: <path d="M7 14l3-3 3 3 5-5m0 0l-4 0m4 0v4" />,
    check: <path d="M5 13l4 4L19 7" />,
  };

  return icons[iconName as keyof typeof icons] || null;
}
```

---

## Anti-Patterns to Avoid

❌ **Adult-Centric Profile Design**: Don't design profiles that require adult literacy or complex navigation for children

- **Why bad**: Children can't effectively use profiles meant for them, defeats safety purpose
- **Better**: Age-appropriate UI with large buttons, simple icons, and voice guidance options

❌ **Weak Parental Controls**: Don't implement parental controls that are easily bypassed or overly permissive

- **Why bad**: Fails to protect children, creates false sense of security for parents
- **Better**: Multi-layered security with PIN protection, content verification, and usage monitoring

❌ **Profile-Blind Content**: Don't show the same content recommendations regardless of profile age and restrictions

- **Why bad**: Defeats purpose of profile system, exposes inappropriate content
- **Better**: Strict profile-based filtering with content approval workflows for edge cases

❌ **Complex Family Management**: Don't require technical expertise to set up basic family safety controls

- **Why bad**: Excludes less technical parents, reduces adoption of safety features
- **Better**: Guided setup wizard with smart defaults and clear explanations

❌ **Privacy-Invasive Monitoring**: Don't implement surveillance features that violate family trust

- **Why bad**: Creates adversarial relationship between parents and children
- **Better**: Transparent monitoring focused on safety and healthy usage patterns

---

## Variation Guidance

**IMPORTANT**: Profile implementations should vary based on family composition and cultural context.

**Vary by Family Structure**:

- **Single Parents**: Simplified controls with emergency contact features
- **Two-Parent Households**: Shared control dashboard with individual parent permissions
- **Multi-Generational**: Grandparent-friendly interfaces with accessibility considerations
- **Blended Families**: Complex custody and permission structures

**Vary by Cultural Context**:

- **Conservative Families**: Strict content filtering with religious/cultural sensitivity options
- **Liberal Households**: Flexible controls focused on age-appropriateness over content type
- **International Families**: Multi-language support with region-appropriate content ratings
- **Privacy-Conscious**: Minimal data collection with local-only profile storage

**Vary by Child Ages**:

- **Toddlers (2-4)**: Picture-only interfaces with parent-initiated sessions
- **Elementary (6-12)**: Simple profiles with clear usage feedback and rewards
- **Teens (13-17)**: More autonomy with graduated restrictions and trust-building features
- **Mixed Ages**: Adaptive interface that scales complexity per user

**Avoid converging on single Netflix-Kids-clone approach** - build profile system that reflects diverse family values and structures while maintaining consistent safety standards.

---

## Remember

**Profiles are not just user accounts - they're family safety and personalization systems that must balance freedom with protection.**

The best family profile systems:

- Prioritize child safety without creating adversarial relationships
- Adapt intelligently to different family structures and values
- Make complex parental controls simple and accessible
- Respect privacy while enabling appropriate oversight

**This profile framework empowers SOFATHEK to serve diverse families while maintaining the highest standards of child protection and user experience quality.**
