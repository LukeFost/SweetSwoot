use ic_cdk::{query, update};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{watch_event::{WatchEvent, WatchEventList}, WATCH_LOG, VIDEOS};

/// Logs a watch event for a video
#[update]
pub fn log_watch_event(
    video_id: String,
    watch_duration_sec: u32,
    liked: bool,
    completed: bool
) -> Result<(), String> {
    // Verify the video exists
    VIDEOS.with(|videos| {
        if !videos.borrow().contains_key(&video_id) {
            return Err("Video not found".to_string());
        }
        Ok(())
    })?;

    // Generate timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    // Create watch event
    let event = WatchEvent {
        user_principal: ic_cdk::caller(),
        video_id: video_id.clone(),
        watch_duration_sec,
        liked,
        completed,
        timestamp,
    };

    // Store event
    WATCH_LOG.with(|log| {
        let mut log_map = log.borrow_mut();
        let events = match log_map.get(&video_id) {
            Some(event_list) => {
                let mut events = event_list.0.clone();
                events.push(event);
                WatchEventList(events)
            }
            None => WatchEventList(vec![event]),
        };
        log_map.insert(video_id, events);
        Ok(())
    })
}

/// Returns all watch events for a specific video
#[query]
pub fn get_watch_events(video_id: String) -> Vec<WatchEvent> {
    WATCH_LOG.with(|log| {
        log.borrow()
            .get(&video_id)
            .map(|event_list| event_list.0.clone())
            .unwrap_or_default()
    })
}

/// Returns watch events for the calling user
#[query]
pub fn get_my_watch_events() -> Vec<WatchEvent> {
    let caller = ic_cdk::caller();
    
    WATCH_LOG.with(|log| {
        log.borrow()
            .iter()
            .flat_map(|(_, event_list)| event_list.0.clone())
            .filter(|event| event.user_principal == caller)
            .collect()
    })
}

/// Returns analytics for a specific video
#[query]
pub fn get_video_analytics(video_id: String) -> Result<VideoAnalytics, String> {
    // Verify the video exists
    VIDEOS.with(|videos| {
        if !videos.borrow().contains_key(&video_id) {
            return Err("Video not found".to_string());
        }
        Ok(())
    })?;

    let events = WATCH_LOG.with(|log| {
        log.borrow()
            .get(&video_id)
            .map(|event_list| event_list.0.clone())
            .unwrap_or_default()
    });

    // Calculate analytics
    let total_views = events.len() as u64;
    let total_unique_viewers = events
        .iter()
        .map(|e| e.user_principal)
        .collect::<std::collections::HashSet<_>>()
        .len() as u64;
    
    let total_likes = events.iter().filter(|e| e.liked).count() as u64;
    let total_completions = events.iter().filter(|e| e.completed).count() as u64;
    
    let avg_watch_duration = if !events.is_empty() {
        events.iter().map(|e| e.watch_duration_sec as u64).sum::<u64>() / total_views
    } else {
        0
    };

    Ok(VideoAnalytics {
        total_views,
        total_unique_viewers,
        total_likes,
        total_completions,
        avg_watch_duration,
    })
}

// Structure to represent video analytics
#[derive(candid::CandidType, serde::Deserialize, Debug, Clone)]
pub struct VideoAnalytics {
    pub total_views: u64,
    pub total_unique_viewers: u64,
    pub total_likes: u64,
    pub total_completions: u64,
    pub avg_watch_duration: u64,
}