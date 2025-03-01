use ic_cdk::{query, update};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{comment::{Comment, CommentList}, COMMENTS, VIDEOS};

/// Posts a comment on a video
#[update]
pub fn post_comment(video_id: String, text: String) -> Result<Comment, String> {
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
    
    // Create comment
    let comment = Comment {
        commenter_principal: ic_cdk::caller(),
        video_id: video_id.clone(),
        text,
        timestamp,
    };
    
    // Store comment
    COMMENTS.with(|comments| {
        let mut comments_map = comments.borrow_mut();
        let video_comments = match comments_map.get(&video_id) {
            Some(comment_list) => {
                let mut existing = comment_list.0.clone();
                existing.push(comment.clone());
                CommentList(existing)
            }
            None => CommentList(vec![comment.clone()]),
        };
        comments_map.insert(video_id, video_comments);
        Ok(comment)
    })
}

/// Gets comments for a video
#[query]
pub fn get_comments(video_id: String) -> Vec<Comment> {
    COMMENTS.with(|comments| {
        comments
            .borrow()
            .get(&video_id)
            .map(|comment_list| comment_list.0.clone())
            .unwrap_or_default()
    })
}

/// Gets all comments by the calling user
#[query]
pub fn get_my_comments() -> Vec<Comment> {
    let caller = ic_cdk::caller();
    
    COMMENTS.with(|comments| {
        comments
            .borrow()
            .iter()
            .flat_map(|(_, comment_list)| comment_list.0.clone())
            .filter(|comment| comment.commenter_principal == caller)
            .collect()
    })
}

/// Deletes a comment (only by the commenter)
#[update]
pub fn delete_comment(video_id: String, timestamp: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    COMMENTS.with(|comments| {
        let mut comments_map = comments.borrow_mut();
        
        // Check if the video has comments
        if let Some(comment_list) = comments_map.get(&video_id) {
            let mut video_comments = comment_list.0.clone();
            
            // Find the comment index
            let comment_idx = video_comments
                .iter()
                .position(|c| c.timestamp == timestamp && c.commenter_principal == caller);
            
            if let Some(idx) = comment_idx {
                // Remove the comment
                video_comments.remove(idx);
                comments_map.insert(video_id, CommentList(video_comments));
                Ok(())
            } else {
                Err("Comment not found or you don't have permission to delete it".to_string())
            }
        } else {
            Err("No comments found for this video".to_string())
        }
    })
}