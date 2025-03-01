use crate::{VideoMetadata, VIDEOS};
use candid::Principal;

/// Search for videos matching the given query in title or tags
pub fn search_videos(
    query: String,
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    // Empty query returns most recent videos
    if query.is_empty() {
        return list_recent_videos(limit, offset);
    }
    
    let query = query.to_lowercase(); // Case-insensitive search
    
    VIDEOS.with(|videos| {
        let videos_map = videos.borrow();
        let mut results: Vec<VideoMetadata> = videos_map
            .iter()
            .filter(|(_, metadata)| {
                // Search in title
                let title_match = metadata.title.to_lowercase().contains(&query);
                
                // Search in tags
                let tag_match = metadata.tags.iter().any(|tag| 
                    tag.to_lowercase().contains(&query)
                );
                
                // Match if either title or tags contain the query
                title_match || tag_match
            })
            .map(|(_, metadata)| metadata.clone())
            .collect();
        
        // Sort by timestamp (newest first)
        results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Apply pagination
        apply_pagination(results, limit, offset)
    })
}

/// Search for videos matching all specified tags
pub fn search_videos_by_tags(
    tags: Vec<String>,
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    // If no tags provided, return recent videos
    if tags.is_empty() {
        return list_recent_videos(limit, offset);
    }
    
    // Convert tags to lowercase for case-insensitive matching
    let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();
    
    VIDEOS.with(|videos| {
        let videos_map = videos.borrow();
        let mut results: Vec<VideoMetadata> = videos_map
            .iter()
            .filter(|(_, metadata)| {
                // Video matches if it contains all the specified tags
                tags_lower.iter().all(|search_tag| {
                    metadata.tags.iter().any(|video_tag| 
                        video_tag.to_lowercase() == *search_tag
                    )
                })
            })
            .map(|(_, metadata)| metadata.clone())
            .collect();
            
        // Sort by timestamp (newest first)
        results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Apply pagination
        apply_pagination(results, limit, offset)
    })
}

/// Get most recent videos
pub fn list_recent_videos(
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    VIDEOS.with(|videos| {
        let videos_map = videos.borrow();
        let mut results: Vec<VideoMetadata> = videos_map
            .iter()
            .map(|(_, metadata)| metadata.clone())
            .collect();
            
        // Sort by timestamp (newest first)
        results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Apply pagination
        apply_pagination(results, limit, offset)
    })
}

/// Helper function to apply pagination to a vector of results
fn apply_pagination(
    results: Vec<VideoMetadata>,
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    let start = offset.unwrap_or(0) as usize;
    let end = if let Some(limit_val) = limit {
        start + limit_val as usize
    } else {
        results.len()
    };
    
    if start < results.len() {
        results[start..std::cmp::min(end, results.len())].to_vec()
    } else {
        Vec::new()
    }
}