use candid::Principal;
use ic_cdk::{query, update};
// Removed unused imports

use crate::{video_metadata::VideoMetadata, VIDEOS};

/// Creates a new video metadata entry
#[update]
pub fn create_video_metadata(
    video_id: String,
    title: String,
    tags: Vec<String>,
    storage_ref: Option<String>,
) -> Result<VideoMetadata, String> {
    // Generate timestamp using IC time instead of SystemTime
    let timestamp = ic_cdk::api::time() / 1_000_000_000; // Convert nanoseconds to seconds

    // Create metadata
    let metadata = VideoMetadata {
        video_id: video_id.clone(),
        uploader_principal: ic_cdk::caller(),
        tags,
        title,
        storage_ref,
        timestamp,
    };

    // Store it
    VIDEOS.with(|videos| {
        let mut videos_map = videos.borrow_mut();
        if videos_map.contains_key(&video_id) {
            return Err("Video ID already exists".to_string());
        }
        videos_map.insert(video_id, metadata.clone());
        Ok(metadata)
    })
}

/// Returns a video's metadata by ID
#[query]
pub fn get_video_metadata(video_id: String) -> Result<VideoMetadata, String> {
    VIDEOS.with(|videos| {
        videos
            .borrow()
            .get(&video_id)
            .ok_or_else(|| "Video not found".to_string())
    })
}

/// Lists all videos
#[query]
pub fn list_all_videos() -> Vec<VideoMetadata> {
    VIDEOS.with(|videos| {
        videos
            .borrow()
            .iter()
            .map(|(_, metadata)| metadata)
            .collect()
    })
}

/// Lists videos by tag
#[query]
pub fn list_videos_by_tag(tag: String) -> Vec<VideoMetadata> {
    VIDEOS.with(|videos| {
        videos
            .borrow()
            .iter()
            .filter(|(_, metadata)| metadata.tags.contains(&tag))
            .map(|(_, metadata)| metadata)
            .collect()
    })
}

/// Lists videos by uploader
#[query]
pub fn list_videos_by_uploader(uploader: Principal) -> Vec<VideoMetadata> {
    VIDEOS.with(|videos| {
        videos
            .borrow()
            .iter()
            .filter(|(_, metadata)| metadata.uploader_principal == uploader)
            .map(|(_, metadata)| metadata)
            .collect()
    })
}

/// Updates a video's metadata
#[update]
pub fn update_video_metadata(
    video_id: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    storage_ref: Option<String>,
) -> Result<VideoMetadata, String> {
    VIDEOS.with(|videos| {
        let mut videos_map = videos.borrow_mut();
        
        // Check if video exists
        if let Some(mut metadata) = videos_map.get(&video_id) {
            // Verify ownership
            if metadata.uploader_principal != ic_cdk::caller() {
                return Err("Only the uploader can update video metadata".to_string());
            }
            
            // Update fields if provided
            if let Some(new_title) = title {
                metadata.title = new_title;
            }
            
            if let Some(new_tags) = tags {
                metadata.tags = new_tags;
            }
            
            if storage_ref.is_some() {
                metadata.storage_ref = storage_ref;
            }
            
            // Save updated metadata
            videos_map.insert(video_id, metadata.clone());
            Ok(metadata)
        } else {
            Err("Video not found".to_string())
        }
    })
}

/// Deletes a video (only by uploader)
#[update]
pub fn delete_video(video_id: String) -> Result<(), String> {
    VIDEOS.with(|videos| {
        let mut videos_map = videos.borrow_mut();
        
        // Check if video exists
        if let Some(metadata) = videos_map.get(&video_id) {
            // Verify ownership
            if metadata.uploader_principal != ic_cdk::caller() {
                return Err("Only the uploader can delete the video".to_string());
            }
            
            // Delete video
            videos_map.remove(&video_id);
            Ok(())
        } else {
            Err("Video not found".to_string())
        }
    })
}
