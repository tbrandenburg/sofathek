# Supported Video URLs

Sofathek supports downloading videos from **1000+ sites** via yt-dlp.

## Supported Sites

### Major Platforms
- **YouTube** - All video types including shorts, live streams, age-restricted content
- **Vimeo** - Videos, live streams
- **Twitter/X** - Videos from tweets
- **TikTok** - Videos and user content
- **Instagram** - Videos from posts and reels
- **Facebook** - Public videos
- **Reddit** - Videos from posts

### Video Platforms
- **PornHub** - Adult content
- **XVideos** - Adult content  
- **xHamster** - Adult content
- **SpankBang** - Adult content
- **TNAFlix** - Adult content
- **DAILYMOTION** - General video platform

### For a complete list, visit: https://ytdl-org.github.io/youtube-dl/supportedsites.html

## URL Requirements

### Valid URL Format
- Must be a valid HTTP or HTTPS URL
- Maximum length: 2000 characters
- No shell metacharacters (`; & | \` $ () {} [] < >`)
- Must be publicly accessible

### Examples

**YouTube:**
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

**Vimeo:**
```
https://vimeo.com/VIDEO_ID
https://player.vimeo.com/video/VIDEO_ID
```

**Twitter/X:**
```
https://twitter.com/user/status/VIDEO_ID
https://x.com/user/status/VIDEO_ID
```

**TikTok:**
```
https://www.tiktok.com/@user/video/VIDEO_ID
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid video URL format` | URL doesn't match expected format | Ensure URL is valid HTTP/HTTPS |
| `Video unavailable` | Content geolocked or deleted | Content cannot be accessed |
| `Unsupported site` | Site not supported by yt-dlp | Check site is in supported list |
| `yt-dlp not found` | yt-dlp not installed | Install yt-dlp in container |

### Unsupported Content
- Private/unlisted videos (unless you have direct link)
- Age-restricted content (may fail)
- Region-locked content (depends on server location)
- Live streams (limited support)

## Configuration

### yt-dlp Installation

yt-dlp is required for video downloads. It's included in the Docker container.

For manual installation:
```bash
# Linux/macOS
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# macOS (Homebrew)
brew install yt-dlp
```

### Updating yt-dlp

yt-dlp is frequently updated to support new sites. Update regularly:
```bash
yt-dlp -U
```

Or rebuild Docker container to get latest version.