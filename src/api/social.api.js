// ============================================================
// SOCIAL MEDIA API MODULE
// ============================================================
// This file contains ALL API calls related to the Social Media
// module. It allows admins to create, approve, schedule, and
// analyze social media posts, as well as manage connected social
// media accounts (Facebook, Instagram, etc.)

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// API - Get the list of all social media posts
// ----------------------------
// Fetches social media posts, used on the admin's social posts
// management page. The "params" object can include:
// - status: filter by post status (e.g. pending, scheduled,
//   published, rejected — matching SOCIAL_POST_STATUS constants)
// - platform: filter by which platform the post is for
//   (e.g. Facebook, Instagram)
export const getSocialPosts = (params) => {
  return axiosInstance.get("/api/v1/social/posts/", { params });
};

// ----------------------------
// API  - Create a new social media post
// ----------------------------
// Allows an admin to create a new social media post, typically
// generated around a specific product. The "data" payload is
// expected to include:
// - product: which product this post is promoting
// - platform: which platform it's intended for
// - caption: the actual post text/caption
// - hashtags: relevant hashtags to include
// - image_url: the image to attach to the post
// - scheduled_at: when this post should go live (if scheduling
//   immediately during creation)
export const createSocialPost = (data) => {
  return axiosInstance.post("/api/v1/social/posts/create/", data);
};

// ----------------------------
// API - Get full details of a specific post
// ----------------------------
// Fetches everything about one specific social media post,
// identified by its ID — used on a post detail/preview page,
// e.g. before approving or rejecting it.
export const getSocialPostById = (id) => {
  return axiosInstance.get(`/api/v1/social/posts/${id}/`);
  // Template literal inserts the "id" directly into the URL path
};

// ----------------------------
// API - Permanently delete a post
// ----------------------------
// Removes a social media post entirely from the system. Unlike
// some other delete operations in this project, the comment here
// notes this is a PERMANENT delete (not a soft delete).
export const deleteSocialPost = (id) => {
  return axiosInstance.delete(`/api/v1/social/posts/${id}/`);
};

// ----------------------------
// API - Approve a post and set its schedule
// ----------------------------
// Allows an admin to approve a pending post, moving it toward
// being published. The "data" payload is expected to include:
// - scheduled_at: the date/time when this approved post should
//   actually go live on the social platform
export const approvePost = (id, data) => {
  return axiosInstance.put(`/api/v1/social/posts/${id}/approve/`, data);
};

// ----------------------------
// API - Reject a post
// ----------------------------
// Allows an admin to reject a pending post instead of approving it.
// The "data" payload is expected to include:
// - reason: why the post was rejected (e.g. feedback for whoever
//   created it, or just an internal note)
export const rejectPost = (id, data) => {
  return axiosInstance.put(`/api/v1/social/posts/${id}/reject/`, data);
};

// ----------------------------
// API - Change a post's schedule
// ----------------------------
// Allows an admin to RESCHEDULE an already-approved post to a
// different date/time. The "data" payload is expected to include:
// - scheduled_at: the new date/time for this post to go live
export const schedulePost = (id, data) => {
  return axiosInstance.put(`/api/v1/social/posts/${id}/schedule/`, data);
};

// ----------------------------
// API - Get posts for the calendar view
// ----------------------------
// Fetches posts already grouped/organized by date, specifically
// formatted for displaying in a calendar-style UI (e.g. a monthly
// grid showing which posts are scheduled on which days).
// The "params" object includes:
// - month: which month to fetch the calendar data for
export const getPostsCalendar = (params) => {
  return axiosInstance.get("/api/v1/social/posts/calendar/", { params });
};

// ----------------------------
// API - Connect a social media account
// ----------------------------
// Called AFTER an OAuth authorization flow completes (e.g. the admin
// logs into Facebook/Instagram and grants permission). The "data"
// payload is expected to include:
// - platform: which platform was connected (e.g. Facebook, Instagram)
// - account_name: the name of the connected account/page
// - access_token: the OAuth token needed to post on behalf of this account
// - page_id: the specific page/account ID on that platform
// - token_expiry: when this access token will expire (so it can be
//   refreshed before it stops working)
export const connectSocialAccount = (data) => {
  return axiosInstance.post("/api/v1/social/accounts/connect/", data);
};

// ----------------------------
// API - Get the list of connected social media accounts
// ----------------------------
// Fetches all the social media accounts currently linked to the
// store, so admins can see which platforms are connected and
// available for posting.
export const getSocialAccounts = () => {
  return axiosInstance.get("/api/v1/social/accounts/");
};

// ----------------------------
// API - Get engagement analytics for a published post
// ----------------------------
// Fetches performance metrics for a specific post that has ALREADY
// been published — including likes, comments, shares, and overall
// reach. Used to show admins how well their social media posts
// are performing.
export const getPostAnalytics = (postId) => {
  return axiosInstance.get(`/api/v1/social/analytics/${postId}/`);
};
