#!/usr/bin/env ts-node

/**
 * Script to verify and generate missing thumbnails for all videos in the library
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../src/config';
import { ThumbnailService } from '../src/services/thumbnailService';
// import { logger } from '../src/utils/logger';

async function main() {
  try {
    console.log('🔍 Verifying thumbnails for all videos...\n');
    
    // Initialize thumbnail service
    const thumbnailService = new ThumbnailService(config.tempDir, config.thumbnailsDir);
    
    // Get all video files
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];
    const videoFiles = await fs.readdir(config.videosDir);
    const videos = videoFiles.filter(file => 
      videoExtensions.includes(path.extname(file).toLowerCase())
    );
    
    if (videos.length === 0) {
      console.log('📭 No videos found in library');
      return;
    }
    
    console.log(`📹 Found ${videos.length} video files:`);
    videos.forEach(video => console.log(`  - ${video}`));
    console.log();
    
    // Check thumbnails
    const results = {
      existing: [] as string[],
      missing: [] as string[],
      generated: [] as string[],
      failed: [] as Array<{ video: string, error: string }>
    };
    
    for (const video of videos) {
      const videoPath = path.join(config.videosDir, video);
      
      // Check if thumbnail exists
      const hasThumb = await thumbnailService.thumbnailExists(videoPath);
      
      if (hasThumb) {
        console.log(`✅ ${video} - thumbnail exists`);
        results.existing.push(video);
      } else {
        console.log(`❌ ${video} - thumbnail missing, generating...`);
        results.missing.push(video);
        
        try {
          await thumbnailService.generateThumbnail(videoPath);
          console.log(`✅ ${video} - thumbnail generated successfully`);
          results.generated.push(video);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.log(`❌ ${video} - thumbnail generation failed: ${errorMsg}`);
          results.failed.push({ video, error: errorMsg });
        }
      }
    }
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`  Existing thumbnails: ${results.existing.length}`);
    console.log(`  Missing thumbnails: ${results.missing.length}`);
    console.log(`  Generated thumbnails: ${results.generated.length}`);
    console.log(`  Failed generations: ${results.failed.length}`);
    
    if (results.generated.length > 0) {
      console.log('\n✨ Generated thumbnails:');
      results.generated.forEach(video => console.log(`  - ${video}`));
    }
    
    if (results.failed.length > 0) {
      console.log('\n⚠️  Failed generations:');
      results.failed.forEach(({ video, error }) => console.log(`  - ${video}: ${error}`));
    }
    
    // Verify thumbnail directory
    const thumbnailFiles = await fs.readdir(config.thumbnailsDir);
    const jpgFiles = thumbnailFiles.filter(file => file.endsWith('.jpg'));
    
    console.log(`\n📁 Thumbnail directory contains ${jpgFiles.length} .jpg files`);
    
    // Check for orphaned thumbnails
    const orphanedThumbs = jpgFiles.filter(thumbFile => {
      const baseName = path.basename(thumbFile, '.jpg');
      return !videos.some(video => path.basename(video, path.extname(video)) === baseName);
    });
    
    if (orphanedThumbs.length > 0) {
      console.log(`\n🗑️  Found ${orphanedThumbs.length} orphaned thumbnails:`);
      orphanedThumbs.forEach(thumb => console.log(`  - ${thumb}`));
    }
    
    console.log('\n✅ Thumbnail verification complete!');
    
    if (results.failed.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Thumbnail verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}