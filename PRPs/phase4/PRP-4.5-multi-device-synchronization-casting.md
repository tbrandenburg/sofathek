# PRP-4.5: Multi-Device Synchronization & Casting

**Project**: SOFATHEK Media Center  
**Phase**: 4 - Video Streaming & Playback  
**Priority**: High  
**Complexity**: High  
**Estimated Effort**: 16-20 hours

## Purpose & Core Principles

### Philosophy: Media Should Flow Seamlessly Across Your Digital Ecosystem

Effective multi-device synchronization isn't about technical protocol implementation—it's about **creating a unified viewing experience** that transcends individual devices. Users should feel that their media library and viewing progress exist as a cohesive entity that naturally follows them wherever they go, whether that's from phone to TV, laptop to tablet, or any combination of family devices.

**Before implementing multi-device features, ask**:

- How can we make device switching feel natural rather than technical?
- What would Netflix-level device continuity look like in a self-hosted family environment?
- How do we balance seamless connectivity with privacy and security in a family setting?

**Core principles**:

1. **Seamless Continuity**: Starting on one device and continuing on another should be effortless
2. **Family-Aware Synchronization**: Support both individual and shared viewing contexts
3. **Network Intelligence**: Automatically discover and connect to appropriate devices
4. **Privacy Respect**: Sync selectively—not all viewing should be shared across all devices
5. **Graceful Degradation**: Core functionality works even when advanced sync features are unavailable

### The Multi-Device Mental Model

Think of multi-device sync as **digital media telepathy** rather than data synchronization:

- **Basic casting**: Like shouting from one room to another—functional but crude
- **Smart synchronization**: Like having conversations seamlessly continue across rooms
- **Family-aware connectivity**: Like a home that automatically knows who's where and what they want to watch

## Gap Analysis: Current State vs. Netflix-Grade Multi-Device Experience

### Current Implementation Gaps

**❌ No Cross-Device Awareness**:

```typescript
// Current isolated approach - no device communication
const videoPlayer = new VideoPlayer(videoId); // Each device operates independently
```

**❌ No Casting Capabilities**: No way to send content from phone to TV or between devices  
**❌ No Synchronization**: Progress, quality preferences, and viewing state trapped on individual devices  
**❌ No Device Discovery**: No automatic detection of available SOFATHEK instances or cast targets  
**❌ No Handoff Support**: Cannot seamlessly transfer active playback between devices  
**❌ No Family Context**: No understanding of shared vs individual viewing sessions

### Netflix-Grade Multi-Device Requirements

**✅ Universal Progress Sync**: Viewing progress automatically syncs across all family devices  
**✅ Chromecast & AirPlay Support**: Native casting to popular TV devices and smart TVs  
**✅ Device Discovery**: Automatic detection of available SOFATHEK instances on local network  
**✅ Seamless Handoff**: Transfer active playback from one device to another without interruption  
**✅ Quality Preference Sync**: Video quality and playback preferences follow users across devices  
**✅ Family Viewing Coordination**: Detect and handle multi-user viewing sessions appropriately  
**✅ Remote Control Capabilities**: Use mobile devices as remotes for TV viewing

## Detailed Implementation

### 1. Device Discovery & Network Synchronization Service

**Core multi-device orchestration service** (`backend/src/services/multiDeviceService.ts`):

```typescript
import { EventEmitter } from 'events';
import dgram from 'dgram';
import { WebSocket, WebSocketServer } from 'ws';
import { createHash } from 'crypto';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';
  ipAddress: string;
  port: number;
  capabilities: DeviceCapabilities;
  lastSeen: Date;
  isActive: boolean;
  currentProfile?: string;
  currentlyWatching?: CurrentlyWatching;
}

interface DeviceCapabilities {
  canCast: boolean;
  canReceiveCast: boolean;
  supportsRemoteControl: boolean;
  supportsProgressSync: boolean;
  maxResolution: string;
  audioFormats: string[];
  videoFormats: string[];
}

interface CurrentlyWatching {
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  quality: string;
  sessionId: string;
}

interface SyncMessage {
  type: 'progress_update' | 'quality_change' | 'play_pause' | 'seek' | 'handoff_request' | 'handoff_accept';
  deviceId: string;
  sessionId: string;
  data: any;
  timestamp: number;
}

class MultiDeviceService extends EventEmitter {
  private devices = new Map<string, DeviceInfo>();
  private wsServer: WebSocketServer;
  private discoverySocket: dgram.Socket;
  private syncSessions = new Map<string, SyncSession>();

  private readonly DISCOVERY_PORT = 54321;
  private readonly WS_PORT = 54322;
  private readonly DISCOVERY_INTERVAL = 30000; // 30 seconds
  private readonly DEVICE_TIMEOUT = 120000; // 2 minutes

  constructor() {
    super();
    this.initializeDiscovery();
    this.initializeWebSocketServer();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize UDP-based device discovery
   * Philosophy: Devices should find each other automatically without user configuration
   */
  private initializeDiscovery(): void {
    this.discoverySocket = dgram.createSocket('udp4');

    this.discoverySocket.on('message', (msg, rinfo) => {
      try {
        const message = JSON.parse(msg.toString());
        if (message.type === 'sofathek_discovery') {
          this.handleDiscoveryMessage(message, rinfo);
        } else if (message.type === 'sofathek_announce') {
          this.handleDeviceAnnouncement(message, rinfo);
        }
      } catch (error) {
        console.error('Discovery message parse error:', error);
      }
    });

    this.discoverySocket.bind(this.DISCOVERY_PORT, () => {
      console.log(`Device discovery listening on port ${this.DISCOVERY_PORT}`);
      this.broadcastAnnouncement();
    });

    // Periodic discovery broadcast
    setInterval(() => {
      this.broadcastAnnouncement();
    }, this.DISCOVERY_INTERVAL);
  }

  /**
   * Initialize WebSocket server for real-time device synchronization
   */
  private initializeWebSocketServer(): void {
    this.wsServer = new WebSocketServer({ port: this.WS_PORT });

    this.wsServer.on('connection', (ws, req) => {
      const deviceId = this.extractDeviceId(req);

      ws.on('message', data => {
        try {
          const message: SyncMessage = JSON.parse(data.toString());
          this.handleSyncMessage(message, deviceId, ws);
        } catch (error) {
          console.error('Sync message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.handleDeviceDisconnect(deviceId);
      });

      console.log(`Device ${deviceId} connected for synchronization`);
    });
  }

  /**
   * Broadcast device announcement for network discovery
   */
  private broadcastAnnouncement(): void {
    const announcement = {
      type: 'sofathek_announce',
      deviceId: this.getServerDeviceId(),
      deviceName: process.env.SOFATHEK_DEVICE_NAME || 'SOFATHEK Media Center',
      deviceType: 'server',
      port: this.WS_PORT,
      capabilities: {
        canCast: false,
        canReceiveCast: true,
        supportsRemoteControl: true,
        supportsProgressSync: true,
        maxResolution: '2160p',
        audioFormats: ['mp3', 'aac', 'ac3', 'dts'],
        videoFormats: ['mp4', 'webm', 'mkv', 'avi'],
      },
      timestamp: Date.now(),
    };

    const message = Buffer.from(JSON.stringify(announcement));

    // Broadcast to local network
    this.discoverySocket.setBroadcast(true);
    this.discoverySocket.send(message, this.DISCOVERY_PORT, '255.255.255.255', err => {
      if (err) console.error('Discovery broadcast error:', err);
    });
  }

  /**
   * Handle device discovery and announcement messages
   */
  private handleDeviceAnnouncement(message: any, rinfo: dgram.RemoteInfo): void {
    const device: DeviceInfo = {
      deviceId: message.deviceId,
      deviceName: message.deviceName,
      deviceType: message.deviceType || 'unknown',
      ipAddress: rinfo.address,
      port: message.port,
      capabilities: message.capabilities || {},
      lastSeen: new Date(),
      isActive: true,
    };

    this.devices.set(device.deviceId, device);
    this.emit('deviceDiscovered', device);

    console.log(`Discovered device: ${device.deviceName} (${device.deviceType}) at ${device.ipAddress}`);
  }

  /**
   * Handle real-time synchronization messages between devices
   * Philosophy: Sync should be immediate and bi-directional
   */
  private handleSyncMessage(message: SyncMessage, fromDeviceId: string, ws: WebSocket): void {
    switch (message.type) {
      case 'progress_update':
        this.handleProgressUpdate(message, fromDeviceId);
        break;

      case 'quality_change':
        this.handleQualityChange(message, fromDeviceId);
        break;

      case 'play_pause':
        this.handlePlayPauseSync(message, fromDeviceId);
        break;

      case 'seek':
        this.handleSeekSync(message, fromDeviceId);
        break;

      case 'handoff_request':
        this.handleHandoffRequest(message, fromDeviceId, ws);
        break;

      case 'handoff_accept':
        this.handleHandoffAccept(message, fromDeviceId);
        break;

      default:
        console.warn('Unknown sync message type:', message.type);
    }
  }

  /**
   * Synchronize progress updates across devices
   */
  private handleProgressUpdate(message: SyncMessage, fromDeviceId: string): void {
    const { videoId, currentTime, profileId } = message.data;

    // Update device's current viewing state
    const device = this.devices.get(fromDeviceId);
    if (device) {
      device.currentlyWatching = {
        videoId,
        currentTime,
        isPlaying: message.data.isPlaying,
        quality: message.data.quality,
        sessionId: message.sessionId,
      };
      device.lastSeen = new Date();
    }

    // Broadcast to other devices with same profile
    this.broadcastToProfileDevices(
      profileId,
      {
        type: 'progress_sync',
        fromDevice: fromDeviceId,
        videoId,
        currentTime,
        sessionId: message.sessionId,
      },
      fromDeviceId
    );
  }

  /**
   * Handle device handoff requests
   * Philosophy: Handoff should feel like magic, not a technical process
   */
  private async handleHandoffRequest(message: SyncMessage, fromDeviceId: string, ws: WebSocket): Promise<void> {
    const { targetDeviceId, videoId, currentTime, profileId } = message.data;

    const targetDevice = this.devices.get(targetDeviceId);
    if (!targetDevice || !targetDevice.capabilities.canReceiveCast) {
      ws.send(
        JSON.stringify({
          type: 'handoff_error',
          error: 'Target device not available for casting',
        })
      );
      return;
    }

    // Create handoff session
    const handoffSession = {
      sessionId: this.generateSessionId(),
      sourceDeviceId: fromDeviceId,
      targetDeviceId,
      videoId,
      currentTime,
      profileId,
      timestamp: Date.now(),
    };

    // Send handoff request to target device
    this.sendToDevice(targetDeviceId, {
      type: 'handoff_incoming',
      sessionId: handoffSession.sessionId,
      sourceDevice: this.devices.get(fromDeviceId)?.deviceName,
      videoId,
      currentTime,
      profileId,
    });

    // Wait for acceptance (with timeout)
    setTimeout(() => {
      if (this.syncSessions.has(handoffSession.sessionId)) {
        this.sendToDevice(fromDeviceId, {
          type: 'handoff_timeout',
          sessionId: handoffSession.sessionId,
        });
        this.syncSessions.delete(handoffSession.sessionId);
      }
    }, 30000); // 30 second timeout
  }

  /**
   * Broadcast message to all devices associated with a profile
   */
  private broadcastToProfileDevices(profileId: string, message: any, excludeDeviceId?: string): void {
    this.devices.forEach(device => {
      if (device.currentProfile === profileId && device.deviceId !== excludeDeviceId && device.isActive) {
        this.sendToDevice(device.deviceId, message);
      }
    });
  }

  /**
   * Send message to specific device
   */
  private sendToDevice(deviceId: string, message: any): void {
    // In a full implementation, this would maintain WebSocket connections
    // For now, using HTTP POST as fallback
    const device = this.devices.get(deviceId);
    if (device) {
      fetch(`http://${device.ipAddress}:${device.port}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }).catch(console.error);
    }
  }

  /**
   * Get available devices for casting
   */
  getAvailableDevices(profileId?: string): DeviceInfo[] {
    const now = Date.now();

    return Array.from(this.devices.values())
      .filter(device => {
        // Filter out stale devices
        if (now - device.lastSeen.getTime() > this.DEVICE_TIMEOUT) {
          return false;
        }

        // Filter by profile if specified
        if (profileId && device.currentProfile && device.currentProfile !== profileId) {
          return false;
        }

        return device.capabilities.canReceiveCast;
      })
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  private getServerDeviceId(): string {
    // Generate consistent device ID based on server characteristics
    const serverInfo = `${process.env.HOSTNAME || 'sofathek'}-${process.env.SOFATHEK_INSTANCE_ID || 'default'}`;
    return createHash('sha256').update(serverInfo).digest('hex').substring(0, 16);
  }

  private generateSessionId(): string {
    return createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 16);
  }

  private extractDeviceId(req: any): string {
    // Extract device ID from request headers or generate one
    return (
      req.headers['x-device-id'] ||
      createHash('sha256')
        .update(req.headers['user-agent'] || '')
        .digest('hex')
        .substring(0, 16)
    );
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      this.devices.forEach((device, deviceId) => {
        if (now - device.lastSeen.getTime() > this.DEVICE_TIMEOUT) {
          this.devices.delete(deviceId);
          this.emit('deviceTimeout', device);
        }
      });
    }, 60000); // Clean up every minute
  }

  private handleDeviceDisconnect(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isActive = false;
      this.emit('deviceDisconnected', device);
    }
  }

  private handleQualityChange(message: SyncMessage, fromDeviceId: string): void {
    // Sync quality changes across devices in the same session
    const device = this.devices.get(fromDeviceId);
    if (device?.currentlyWatching) {
      device.currentlyWatching.quality = message.data.quality;

      this.broadcastToProfileDevices(
        device.currentProfile!,
        {
          type: 'quality_sync',
          quality: message.data.quality,
          sessionId: message.sessionId,
        },
        fromDeviceId
      );
    }
  }

  private handlePlayPauseSync(message: SyncMessage, fromDeviceId: string): void {
    const device = this.devices.get(fromDeviceId);
    if (device?.currentlyWatching) {
      device.currentlyWatching.isPlaying = message.data.isPlaying;

      this.broadcastToProfileDevices(
        device.currentProfile!,
        {
          type: 'playback_sync',
          isPlaying: message.data.isPlaying,
          currentTime: message.data.currentTime,
          sessionId: message.sessionId,
        },
        fromDeviceId
      );
    }
  }

  private handleSeekSync(message: SyncMessage, fromDeviceId: string): void {
    const device = this.devices.get(fromDeviceId);
    if (device?.currentlyWatching) {
      device.currentlyWatching.currentTime = message.data.currentTime;

      this.broadcastToProfileDevices(
        device.currentProfile!,
        {
          type: 'seek_sync',
          currentTime: message.data.currentTime,
          sessionId: message.sessionId,
        },
        fromDeviceId
      );
    }
  }

  private handleHandoffAccept(message: SyncMessage, fromDeviceId: string): void {
    const session = this.syncSessions.get(message.sessionId);
    if (session) {
      // Notify source device that handoff was accepted
      this.sendToDevice(session.sourceDeviceId, {
        type: 'handoff_success',
        sessionId: message.sessionId,
        targetDevice: this.devices.get(fromDeviceId)?.deviceName,
      });

      this.syncSessions.delete(message.sessionId);
    }
  }
}

interface SyncSession {
  sessionId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  videoId: string;
  currentTime: number;
  profileId: string;
  timestamp: number;
}

export const multiDeviceService = new MultiDeviceService();
```

### 2. Casting Integration Service

**Chromecast and AirPlay casting support** (`backend/src/services/castingService.ts`):

```typescript
import { EventEmitter } from 'events';
import mdns from 'mdns';

interface CastDevice {
  id: string;
  name: string;
  type: 'chromecast' | 'airplay' | 'dlna';
  ipAddress: string;
  port: number;
  isAvailable: boolean;
}

interface CastSession {
  sessionId: string;
  deviceId: string;
  videoId: string;
  profileId: string;
  currentTime: number;
  isPlaying: boolean;
}

class CastingService extends EventEmitter {
  private castDevices = new Map<string, CastDevice>();
  private activeSessions = new Map<string, CastSession>();
  private browser: mdns.Browser;

  constructor() {
    super();
    this.initializeMDNSDiscovery();
  }

  /**
   * Initialize mDNS/Bonjour discovery for cast devices
   * Philosophy: Cast devices should be discovered automatically
   */
  private initializeMDNSDiscovery(): void {
    try {
      // Discover Chromecast devices
      this.browser = mdns.createBrowser(mdns.tcp('googlecast'));

      this.browser.on('serviceUp', service => {
        this.handleCastDeviceDiscovered(service, 'chromecast');
      });

      this.browser.on('serviceDown', service => {
        this.handleCastDeviceRemoved(service);
      });

      this.browser.start();

      // Also discover AirPlay devices
      const airplayBrowser = mdns.createBrowser(mdns.tcp('airplay'));
      airplayBrowser.on('serviceUp', service => {
        this.handleCastDeviceDiscovered(service, 'airplay');
      });
      airplayBrowser.start();
    } catch (error) {
      console.error('mDNS discovery initialization failed:', error);
    }
  }

  /**
   * Handle discovered cast devices
   */
  private handleCastDeviceDiscovered(service: any, type: 'chromecast' | 'airplay'): void {
    const device: CastDevice = {
      id: service.name + '-' + type,
      name: service.name,
      type,
      ipAddress: service.addresses?.[0] || '',
      port: service.port,
      isAvailable: true,
    };

    this.castDevices.set(device.id, device);
    this.emit('castDeviceDiscovered', device);

    console.log(`Discovered ${type} device: ${device.name} at ${device.ipAddress}:${device.port}`);
  }

  /**
   * Start casting to a specific device
   * Philosophy: Casting should be as simple as selecting a device
   */
  async startCasting(deviceId: string, videoId: string, profileId: string, currentTime: number = 0): Promise<string> {
    const device = this.castDevices.get(deviceId);
    if (!device || !device.isAvailable) {
      throw new Error('Cast device not available');
    }

    const sessionId = this.generateSessionId();

    try {
      switch (device.type) {
        case 'chromecast':
          await this.startChromecastSession(device, videoId, sessionId, currentTime);
          break;

        case 'airplay':
          await this.startAirPlaySession(device, videoId, sessionId, currentTime);
          break;

        default:
          throw new Error(`Unsupported cast device type: ${device.type}`);
      }

      const session: CastSession = {
        sessionId,
        deviceId,
        videoId,
        profileId,
        currentTime,
        isPlaying: true,
      };

      this.activeSessions.set(sessionId, session);
      this.emit('castSessionStarted', session);

      return sessionId;
    } catch (error) {
      console.error('Failed to start casting:', error);
      throw error;
    }
  }

  /**
   * Start Chromecast session using Google Cast protocol
   */
  private async startChromecastSession(
    device: CastDevice,
    videoId: string,
    sessionId: string,
    currentTime: number
  ): Promise<void> {
    // In a full implementation, this would use the Google Cast SDK
    // For this PRP, we'll outline the protocol structure

    const castMessage = {
      type: 'LOAD',
      requestId: Date.now(),
      media: {
        contentId: this.getStreamingUrl(videoId),
        contentType: 'video/mp4',
        streamType: 'BUFFERED',
        metadata: {
          title: await this.getVideoTitle(videoId),
          subtitle: 'SOFATHEK Media Center',
        },
      },
      currentTime,
      autoplay: true,
      customData: {
        sofathekSessionId: sessionId,
        videoId,
      },
    };

    // Send cast message to device (pseudo-code for actual Cast SDK implementation)
    console.log('Would send Chromecast message:', castMessage);
  }

  /**
   * Start AirPlay session using AirPlay protocol
   */
  private async startAirPlaySession(
    device: CastDevice,
    videoId: string,
    sessionId: string,
    currentTime: number
  ): Promise<void> {
    // AirPlay implementation would use HTTP-based protocol
    const airplayMessage = {
      'Content-Location': this.getStreamingUrl(videoId),
      'Start-Position': currentTime,
      'X-Apple-Session-ID': sessionId,
    };

    // Send AirPlay request (pseudo-code)
    console.log('Would send AirPlay message:', airplayMessage);
  }

  /**
   * Control active cast session
   */
  async controlCastSession(sessionId: string, action: 'play' | 'pause' | 'seek' | 'stop', data?: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Cast session not found');
    }

    const device = this.castDevices.get(session.deviceId);
    if (!device) {
      throw new Error('Cast device not found');
    }

    switch (action) {
      case 'play':
        session.isPlaying = true;
        await this.sendCastCommand(device, 'PLAY', { sessionId });
        break;

      case 'pause':
        session.isPlaying = false;
        await this.sendCastCommand(device, 'PAUSE', { sessionId });
        break;

      case 'seek':
        session.currentTime = data.currentTime;
        await this.sendCastCommand(device, 'SEEK', {
          sessionId,
          currentTime: data.currentTime,
        });
        break;

      case 'stop':
        await this.sendCastCommand(device, 'STOP', { sessionId });
        this.activeSessions.delete(sessionId);
        this.emit('castSessionEnded', session);
        break;
    }
  }

  /**
   * Get available cast devices
   */
  getAvailableCastDevices(): CastDevice[] {
    return Array.from(this.castDevices.values())
      .filter(device => device.isAvailable)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async sendCastCommand(device: CastDevice, command: string, data: any): Promise<void> {
    // Device-specific command sending implementation
    console.log(`Sending ${command} to ${device.name}:`, data);
  }

  private getStreamingUrl(videoId: string): string {
    const serverHost = process.env.SOFATHEK_EXTERNAL_HOST || 'localhost:3000';
    return `http://${serverHost}/api/videos/${videoId}/stream`;
  }

  private async getVideoTitle(videoId: string): Promise<string> {
    // Get video title from video library service
    const { videoLibrary } = await import('./videoLibrary.js');
    const video = await videoLibrary.getVideo(videoId);
    return video?.title || 'Unknown Video';
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private handleCastDeviceRemoved(service: any): void {
    const deviceId = service.name + '-chromecast'; // Simplified
    const device = this.castDevices.get(deviceId);

    if (device) {
      device.isAvailable = false;
      this.emit('castDeviceRemoved', device);
    }
  }
}

export const castingService = new CastingService();
```

### 3. React 19 Multi-Device UI Components

**Cast and device synchronization interface** (`frontend/src/components/MultiDevice/CastingControls.tsx`):

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useMultiDevice } from '../../hooks/useMultiDevice';
import { useCasting } from '../../hooks/useCasting';

interface CastingControlsProps {
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  onHandoffRequested?: (targetDeviceId: string) => void;
}

interface CastDevice {
  id: string;
  name: string;
  type: 'chromecast' | 'airplay' | 'dlna' | 'sofathek';
  isAvailable: boolean;
}

/**
 * Casting and device synchronization controls
 * Philosophy: Make device switching feel magical, not technical
 */
export const CastingControls: React.FC<CastingControlsProps> = ({
  videoId,
  currentTime,
  isPlaying,
  onHandoffRequested
}) => {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showHandoffConfirmation, setShowHandoffConfirmation] = useState<string | null>(null);

  const {
    availableDevices,
    connectedDevices,
    requestHandoff,
    syncProgress,
    isConnected: isMultiDeviceConnected
  } = useMultiDevice(videoId);

  const {
    castDevices,
    activeCastSession,
    startCasting,
    controlCasting,
    isCasting
  } = useCasting();

  /**
   * Handle casting to external devices (Chromecast, AirPlay)
   */
  const handleCastToDevice = useCallback(async (device: CastDevice) => {
    try {
      if (device.type === 'sofathek') {
        // Handoff to another SOFATHEK device
        setShowHandoffConfirmation(device.id);
      } else {
        // Cast to external device (Chromecast, AirPlay)
        await startCasting(device.id, videoId, currentTime);
        setShowDeviceMenu(false);
      }
    } catch (error) {
      console.error('Failed to cast to device:', error);
      // TODO: Show user-friendly error message
    }
  }, [startCasting, videoId, currentTime]);

  /**
   * Confirm handoff to another SOFATHEK device
   */
  const confirmHandoff = useCallback(async (targetDeviceId: string) => {
    try {
      await requestHandoff(targetDeviceId, videoId, currentTime);
      onHandoffRequested?.(targetDeviceId);
      setShowHandoffConfirmation(null);
      setShowDeviceMenu(false);
    } catch (error) {
      console.error('Handoff failed:', error);
    }
  }, [requestHandoff, videoId, currentTime, onHandoffRequested]);

  /**
   * Sync current playback state to connected devices
   */
  useEffect(() => {
    if (isMultiDeviceConnected) {
      syncProgress(currentTime, isPlaying);
    }
  }, [currentTime, isPlaying, isMultiDeviceConnected, syncProgress]);

  /**
   * All available devices (both SOFATHEK instances and cast devices)
   */
  const allDevices = [
    ...availableDevices.map(d => ({ ...d, type: 'sofathek' as const })),
    ...castDevices
  ];

  return (
    <div className="casting-controls">
      {/* Cast button */}
      <button
        onClick={() => setShowDeviceMenu(!showDeviceMenu)}
        className={`casting-controls__cast-button ${isCasting ? 'active' : ''}`}
        aria-label="Cast to device"
        disabled={allDevices.length === 0}
      >
        <span className="cast-icon">📺</span>
        {isCasting && <span className="casting-indicator">●</span>}
      </button>

      {/* Connected devices indicator */}
      {connectedDevices.length > 0 && (
        <div className="casting-controls__connected-indicator">
          <span className="sync-icon">🔄</span>
          <span className="connected-count">{connectedDevices.length}</span>
        </div>
      )}

      {/* Device selection menu */}
      {showDeviceMenu && (
        <div className="casting-controls__device-menu">
          <div className="device-menu-header">
            <h3>Cast to Device</h3>
            <button
              onClick={() => setShowDeviceMenu(false)}
              className="close-button"
            >
              ×
            </button>
          </div>

          <div className="device-list">
            {allDevices.length === 0 ? (
              <div className="no-devices">
                <p>No devices available</p>
                <small>Make sure devices are on the same network</small>
              </div>
            ) : (
              allDevices.map((device) => (
                <div
                  key={device.id}
                  className={`device-item ${!device.isAvailable ? 'unavailable' : ''}`}
                  onClick={() => device.isAvailable && handleCastToDevice(device)}
                >
                  <div className="device-info">
                    <div className="device-name">{device.name}</div>
                    <div className="device-type">
                      {device.type === 'sofathek' ? 'SOFATHEK Device' :
                       device.type === 'chromecast' ? 'Chromecast' :
                       device.type === 'airplay' ? 'AirPlay' : 'DLNA Device'}
                    </div>
                  </div>
                  <div className="device-icon">
                    {device.type === 'sofathek' ? '📱' :
                     device.type === 'chromecast' ? '📺' :
                     device.type === 'airplay' ? '🍎' : '📻'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Active cast session controls */}
          {activeCastSession && (
            <div className="active-cast-session">
              <h4>Currently Casting</h4>
              <div className="cast-session-info">
                <span>Casting to {activeCastSession.deviceName}</span>
                <button
                  onClick={() => controlCasting('stop')}
                  className="stop-casting-button"
                >
                  Stop Casting
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Handoff confirmation dialog */}
      {showHandoffConfirmation && (
        <div className="casting-controls__handoff-modal">
          <div className="handoff-modal-content">
            <h3>Continue on Another Device</h3>
            <p>
              Transfer this video to{' '}
              {availableDevices.find(d => d.deviceId === showHandoffConfirmation)?.deviceName}?
            </p>
            <p className="handoff-description">
              The video will continue from {Math.floor(currentTime / 60)}:
              {Math.floor(currentTime % 60).toString().padStart(2, '0')} on the other device.
            </p>

            <div className="handoff-actions">
              <button
                onClick={() => confirmHandoff(showHandoffConfirmation)}
                className="btn btn-primary"
              >
                Continue There
              </button>
              <button
                onClick={() => setShowHandoffConfirmation(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 4. Custom Hooks for Multi-Device Functionality

**Multi-device synchronization hook** (`frontend/src/hooks/useMultiDevice.ts`):

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from './useProfile';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isAvailable: boolean;
  lastSeen: Date;
  currentlyWatching?: {
    videoId: string;
    currentTime: number;
    isPlaying: boolean;
  };
}

interface SyncEvent {
  type: 'progress_sync' | 'quality_sync' | 'playback_sync' | 'seek_sync' | 'handoff_incoming';
  data: any;
  fromDevice?: string;
  sessionId?: string;
}

interface UseMultiDeviceReturn {
  availableDevices: DeviceInfo[];
  connectedDevices: DeviceInfo[];
  isConnected: boolean;
  requestHandoff: (targetDeviceId: string, videoId: string, currentTime: number) => Promise<void>;
  syncProgress: (currentTime: number, isPlaying: boolean) => void;
  onSyncEvent?: (event: SyncEvent) => void;
}

/**
 * Custom hook for multi-device synchronization and handoff
 * Philosophy: Sync should be transparent and automatic
 */
export const useMultiDevice = (videoId: string): UseMultiDeviceReturn => {
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { currentProfile } = useProfile();

  const wsRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef<string>();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Initialize WebSocket connection for real-time synchronization
   */
  useEffect(() => {
    if (!currentProfile) return;

    // Generate or retrieve device ID
    deviceIdRef.current = localStorage.getItem('sofathek-device-id') || generateDeviceId();
    localStorage.setItem('sofathek-device-id', deviceIdRef.current);

    const connectWebSocket = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/sync`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Multi-device sync connected');
        setIsConnected(true);

        // Announce this device
        sendSyncMessage('device_announce', {
          deviceId: deviceIdRef.current,
          deviceName: getDeviceName(),
          deviceType: getDeviceType(),
          profileId: currentProfile.id,
          capabilities: getDeviceCapabilities(),
        });
      };

      wsRef.current.onmessage = event => {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.data);
          handleSyncEvent(syncEvent);
        } catch (error) {
          console.error('Sync message parse error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Multi-device sync disconnected');
        setIsConnected(false);

        // Attempt reconnection after delay
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = error => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [currentProfile]);

  /**
   * Discover available devices on network
   */
  useEffect(() => {
    const discoverDevices = async () => {
      try {
        const response = await fetch('/api/devices/available');
        if (response.ok) {
          const devices = await response.json();
          setAvailableDevices(devices.filter((d: DeviceInfo) => d.deviceId !== deviceIdRef.current));
        }
      } catch (error) {
        console.error('Device discovery failed:', error);
      }
    };

    // Initial discovery
    discoverDevices();

    // Periodic discovery updates
    const discoveryInterval = setInterval(discoverDevices, 30000);

    return () => clearInterval(discoveryInterval);
  }, []);

  /**
   * Handle incoming synchronization events
   */
  const handleSyncEvent = useCallback(
    (event: SyncEvent) => {
      switch (event.type) {
        case 'progress_sync':
          // Update local progress if from same session
          if (event.data.videoId === videoId) {
            // Emit event for video player to handle
            window.dispatchEvent(
              new CustomEvent('multidevice_progress_sync', {
                detail: event.data,
              })
            );
          }
          break;

        case 'playback_sync':
          if (event.data.videoId === videoId) {
            window.dispatchEvent(
              new CustomEvent('multidevice_playback_sync', {
                detail: event.data,
              })
            );
          }
          break;

        case 'seek_sync':
          if (event.data.videoId === videoId) {
            window.dispatchEvent(
              new CustomEvent('multidevice_seek_sync', {
                detail: event.data,
              })
            );
          }
          break;

        case 'handoff_incoming':
          handleIncomingHandoff(event.data);
          break;

        default:
          console.warn('Unknown sync event type:', event.type);
      }
    },
    [videoId]
  );

  /**
   * Handle incoming handoff requests
   */
  const handleIncomingHandoff = useCallback(
    (data: any) => {
      const { sessionId, sourceDevice, videoId: handoffVideoId, currentTime, profileId } = data;

      if (profileId !== currentProfile?.id) {
        // Reject handoff for different profile
        return;
      }

      // Show handoff acceptance UI
      const acceptHandoff = confirm(`${sourceDevice} wants to continue watching on this device. Accept?`);

      if (acceptHandoff) {
        // Navigate to video with resume time
        window.location.href = `/watch/${handoffVideoId}?t=${Math.floor(currentTime)}&handoff=true`;

        // Send acceptance confirmation
        sendSyncMessage('handoff_accept', { sessionId });
      }
    },
    [currentProfile]
  );

  /**
   * Request handoff to another device
   */
  const requestHandoff = useCallback(
    async (targetDeviceId: string, videoId: string, currentTime: number): Promise<void> => {
      if (!isConnected || !currentProfile) {
        throw new Error('Not connected to sync service');
      }

      const handoffRequest = {
        targetDeviceId,
        videoId,
        currentTime,
        profileId: currentProfile.id,
        sessionId: generateSessionId(),
      };

      sendSyncMessage('handoff_request', handoffRequest);

      // Return promise that resolves when handoff is accepted/rejected
      return new Promise((resolve, reject) => {
        const handleHandoffResponse = (event: MessageEvent) => {
          const response = JSON.parse(event.data);
          if (response.type === 'handoff_success' && response.sessionId === handoffRequest.sessionId) {
            resolve();
            wsRef.current?.removeEventListener('message', handleHandoffResponse);
          } else if (response.type === 'handoff_timeout') {
            reject(new Error('Handoff request timed out'));
            wsRef.current?.removeEventListener('message', handleHandoffResponse);
          }
        };

        wsRef.current?.addEventListener('message', handleHandoffResponse);

        // Set timeout for handoff request
        setTimeout(() => {
          reject(new Error('Handoff request timed out'));
          wsRef.current?.removeEventListener('message', handleHandoffResponse);
        }, 30000);
      });
    },
    [isConnected, currentProfile]
  );

  /**
   * Sync progress to connected devices
   */
  const syncProgress = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      if (!isConnected || !currentProfile) return;

      // Debounce sync messages to prevent flooding
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        sendSyncMessage('progress_update', {
          videoId,
          currentTime,
          isPlaying,
          profileId: currentProfile.id,
          timestamp: Date.now(),
        });
      }, 5000); // Sync every 5 seconds
    },
    [isConnected, currentProfile, videoId]
  );

  /**
   * Send message through WebSocket
   */
  const sendSyncMessage = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          deviceId: deviceIdRef.current,
          sessionId: generateSessionId(),
          data,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  return {
    availableDevices,
    connectedDevices,
    isConnected,
    requestHandoff,
    syncProgress,
  };
};

// Helper functions
function generateDeviceId(): string {
  const userAgent = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const deviceString = `${userAgent}-${screen}-${Date.now()}`;

  return btoa(deviceString)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 16);
}

function getDeviceName(): string {
  const userAgent = navigator.userAgent;

  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) return 'Android Device';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Windows/.test(userAgent)) return 'Windows PC';

  return 'Web Browser';
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent;

  if (/Mobile|Android|iPhone/.test(userAgent)) {
    return /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile';
  }

  return 'desktop';
}

function getDeviceCapabilities() {
  return {
    canCast: true,
    canReceiveCast: true,
    supportsRemoteControl: 'ontouchstart' in window, // Touch devices can be remotes
    supportsProgressSync: true,
    maxResolution: getMaxSupportedResolution(),
    audioFormats: getSupportedAudioFormats(),
    videoFormats: getSupportedVideoFormats(),
  };
}

function getMaxSupportedResolution(): string {
  const width = window.screen.width * (window.devicePixelRatio || 1);
  const height = window.screen.height * (window.devicePixelRatio || 1);

  if (width >= 3840 && height >= 2160) return '2160p';
  if (width >= 1920 && height >= 1080) return '1080p';
  if (width >= 1280 && height >= 720) return '720p';
  return '480p';
}

function getSupportedAudioFormats(): string[] {
  const audio = document.createElement('audio');
  const formats = [];

  if (audio.canPlayType('audio/mpeg')) formats.push('mp3');
  if (audio.canPlayType('audio/mp4')) formats.push('aac');
  if (audio.canPlayType('audio/ogg')) formats.push('ogg');
  if (audio.canPlayType('audio/webm')) formats.push('webm');

  return formats;
}

function getSupportedVideoFormats(): string[] {
  const video = document.createElement('video');
  const formats = [];

  if (video.canPlayType('video/mp4')) formats.push('mp4');
  if (video.canPlayType('video/webm')) formats.push('webm');
  if (video.canPlayType('video/ogg')) formats.push('ogg');

  return formats;
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

## Anti-Patterns to Avoid

### ❌ **Polling Overload Anti-Pattern**: Constant Device Discovery

**What not to do**:

```typescript
// DON'T: Poll for devices constantly
setInterval(() => {
  discoverDevices(); // Every second is excessive!
}, 1000);
```

**Why it's problematic**: Overwhelms network, drains battery, provides no user benefit

**Better approach**:

```typescript
// DO: Event-driven discovery with reasonable intervals
mdns.createBrowser().on('serviceUp', handleDeviceDiscovered);
setInterval(refreshDeviceList, 30000); // 30 seconds for cleanup
```

### ❌ **Sync Spam Anti-Pattern**: Every Playback Event Synchronized

**What not to do**:

```typescript
// DON'T: Sync every tiny change
video.addEventListener('timeupdate', () => {
  syncToAllDevices(video.currentTime); // Called 4 times per second!
});
```

**Why it's problematic**: Network flooding, poor performance, unnecessary server load

**Better approach**:

```typescript
// DO: Debounced synchronization
const debouncedSync = debounce(() => {
  syncToAllDevices(video.currentTime);
}, 5000); // Max once per 5 seconds
```

### ❌ **Cast Hijacking Anti-Pattern**: Automatic Device Takeover

**What not to do**:

```typescript
// DON'T: Automatically cast to discovered devices
onDeviceDiscovered(device => {
  if (device.type === 'chromecast') {
    startCasting(device); // No user consent!
  }
});
```

**Why it's problematic**: Interrupts other users, privacy violation, confusing UX

**Better approach**:

```typescript
// DO: Always require explicit user consent for casting
onDeviceDiscovered(device => {
  showCastOption(device); // Let user choose when to cast
});
```

### ❌ **Profile Bleeding Anti-Pattern**: Cross-Profile Synchronization

**What not to do**:

```typescript
// DON'T: Sync across all devices regardless of profile
broadcastToAllDevices(progressUpdate); // Kids see adult content progress!
```

**Why it's problematic**: Privacy violation, inappropriate content exposure, family conflicts

**Better approach**:

```typescript
// DO: Profile-aware synchronization
broadcastToProfileDevices(currentProfile.id, progressUpdate); // Only same profile
```

## Validation & Testing

### 1. Device Discovery Testing

**Network discovery reliability testing**:

```typescript
// tests/multidevice/discovery.test.ts
describe('Device Discovery', () => {
  test('discovers devices on local network', async () => {
    const mockMDNSService = createMockMDNSService();
    const discoveryService = new MultiDeviceService();

    mockMDNSService.announceDevice({
      name: 'Test Chromecast',
      type: 'chromecast',
      ip: '192.168.1.100',
    });

    await waitFor(5000); // Allow discovery time

    const devices = discoveryService.getAvailableDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe('Test Chromecast');
  });
});
```

### 2. Synchronization Accuracy Testing

**Progress sync reliability validation**:

```typescript
describe('Progress Synchronization', () => {
  test('syncs progress between devices with same profile', async () => {
    const device1 = createMockDevice('device-1', 'profile-1');
    const device2 = createMockDevice('device-2', 'profile-1');

    // Device 1 updates progress
    await device1.updateProgress('video-1', 300, true);

    // Verify device 2 receives update
    await waitFor(2000);
    const device2Progress = await device2.getProgress('video-1');

    expect(device2Progress.currentTime).toBeCloseTo(300, 1); // Within 1 second
  });
});
```

### 3. Casting Performance Testing

**Cast session reliability validation**:

```typescript
describe('Casting Performance', () => {
  test('establishes cast session within acceptable time', async () => {
    const mockChromecast = createMockChromecast();
    const castingService = new CastingService();

    const startTime = Date.now();
    const sessionId = await castingService.startCasting(mockChromecast.id, 'video-1', 'profile-1');
    const castTime = Date.now() - startTime;

    expect(castTime).toBeLessThan(5000); // Under 5 seconds
    expect(sessionId).toBeTruthy();
  });
});
```

## Success Metrics

### Connectivity Metrics

- **Device Discovery Success Rate**: > 95% of available devices discovered within 30 seconds
- **Sync Connection Reliability**: 99% uptime for WebSocket connections between active devices
- **Cast Session Success Rate**: > 90% of cast attempts establish successful sessions
- **Network Discovery Latency**: Devices discovered within 10 seconds of network connection

### User Experience Metrics

- **Handoff Success Rate**: > 85% of handoff attempts complete successfully without user confusion
- **Sync Accuracy**: Progress synchronized within 5 seconds across 95% of active sessions
- **Cast Startup Time**: Casting begins playback within 10 seconds of device selection
- **Cross-Device Continuity**: 90% of users successfully resume content after device switches

### Family Usage Metrics

- **Profile Isolation**: 0% cross-contamination of viewing data between family profiles
- **Multi-User Coordination**: Detect and handle 95% of simultaneous viewing sessions correctly
- **Privacy Compliance**: No accidental sharing of individual viewing data across inappropriate profiles

## Integration Points

### Backend Integration

- **Profile System**: Ensure synchronization respects family profile boundaries and preferences
- **Progress Service**: Seamless integration with existing progress tracking for cross-device continuity
- **Video Library**: Support for casting metadata and quality selection across devices

### Frontend Integration

- **Video Player**: Enhanced player with casting controls and sync event handling
- **Navigation**: Handoff support throughout the application, not just during video playback
- **Settings**: Multi-device preferences and privacy controls per profile

### Infrastructure Integration

- **Network Configuration**: Proper mDNS/Bonjour support for device discovery
- **WebSocket Scaling**: Support for multiple concurrent device connections per family
- **Security**: Secure device authentication and encrypted synchronization messages

---

**Implementation Priority**: This PRP completes Phase 4 by adding the sophisticated multi-device capabilities expected in modern media centers. It should be implemented after all other Phase 4 PRPs as it builds upon progress tracking, quality management, and streaming infrastructure while providing the "magic" that makes SOFATHEK feel like a premium, unified family media experience.

**Phase 5 Dependencies**: Phase 5 PRPs (Admin Features & YouTube Integration) can leverage the multi-device infrastructure for coordinated content management and family-wide feature deployment.
