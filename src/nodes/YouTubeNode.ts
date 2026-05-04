import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { BaseNode } from './BaseNode';
import { WorkflowNode, NodeType } from '../types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeNode extends BaseNode {
  nodeType: NodeType = {
    name: 'youtube',
    displayName: 'YouTube',
    description: 'Search videos, get video/channel details, list playlists, and fetch comments via YouTube Data API v3',
    group: 'Social Media',
    inputs: ['main'],
    outputs: ['main'],
    icon: '▶️',
    color: '#ff0000',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        default: 'searchVideos',
        options: [
          { name: 'Search Videos', value: 'searchVideos' },
          { name: 'Get Video Details', value: 'getVideoDetails' },
          { name: 'Get Channel Details', value: 'getChannelDetails' },
          { name: 'List Playlists', value: 'listPlaylists' },
          { name: 'Get Playlist Items', value: 'getPlaylistItems' },
          { name: 'Get Video Comments', value: 'getVideoComments' },
          { name: 'Get Trending Videos', value: 'getTrendingVideos' },
          { name: 'Get Transcript', value: 'getTranscript' }
        ]
      },
      {
        name: 'apiKey',
        displayName: 'API Key',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'AIza...',
        description: 'Your YouTube Data API v3 key from Google Cloud Console'
      },
      {
        name: 'query',
        displayName: 'Search Query',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'node.js tutorial',
        description: 'Search query (for Search Videos operation)'
      },
      {
        name: 'videoId',
        displayName: 'Video ID',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'dQw4w9WgXcQ',
        description: 'YouTube Video ID (for Get Video Details / Get Video Comments)'
      },
      {
        name: 'channelId',
        displayName: 'Channel ID',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'UCxxxxxx',
        description: 'YouTube Channel ID (for Get Channel Details / List Playlists)'
      },
      {
        name: 'playlistId',
        displayName: 'Playlist ID',
        type: 'string',
        required: false,
        default: '',
        placeholder: 'PLxxxxxx',
        description: 'YouTube Playlist ID (for Get Playlist Items)'
      },
      {
        name: 'maxResults',
        displayName: 'Max Results',
        type: 'number',
        required: false,
        default: 10,
        description: 'Maximum number of results to return (1-50)'
      },
      {
        name: 'order',
        displayName: 'Sort Order',
        type: 'options',
        required: false,
        default: 'relevance',
        options: [
          { name: 'Relevance', value: 'relevance' },
          { name: 'Date (Newest)', value: 'date' },
          { name: 'View Count', value: 'viewCount' },
          { name: 'Rating', value: 'rating' },
          { name: 'Title (A-Z)', value: 'title' }
        ]
      },
      {
        name: 'regionCode',
        displayName: 'Region Code',
        type: 'string',
        required: false,
        default: 'US',
        placeholder: 'US',
        description: 'ISO 3166-1 alpha-2 country code for region-specific results'
      },
      {
        name: 'videoDuration',
        displayName: 'Video Duration Filter',
        type: 'options',
        required: false,
        default: 'any',
        options: [
          { name: 'Any', value: 'any' },
          { name: 'Short (< 4 min)', value: 'short' },
          { name: 'Medium (4-20 min)', value: 'medium' },
          { name: 'Long (> 20 min)', value: 'long' }
        ]
      },
      {
        name: 'safeSearch',
        displayName: 'Safe Search',
        type: 'options',
        required: false,
        default: 'moderate',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Moderate', value: 'moderate' },
          { name: 'Strict', value: 'strict' }
        ]
      }
    ]
  };

  async execute(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    const operation = this.getParameter(node, 'operation', 'searchVideos');
    const apiKey = this.getParameter(node, 'apiKey', '');
    const maxResults = Math.min(50, Math.max(1, Number(this.getParameter(node, 'maxResults', 10))));

    if (!apiKey && operation !== 'getTranscript') {
      throw new Error('YouTube API Key is required for this operation');
    }

    switch (operation) {
      case 'searchVideos':
        return await this.searchVideos(node, inputData, apiKey, maxResults);
      case 'getVideoDetails':
        return await this.getVideoDetails(node, inputData, apiKey);
      case 'getChannelDetails':
        return await this.getChannelDetails(node, inputData, apiKey);
      case 'listPlaylists':
        return await this.listPlaylists(node, inputData, apiKey, maxResults);
      case 'getPlaylistItems':
        return await this.getPlaylistItems(node, inputData, apiKey, maxResults);
      case 'getVideoComments':
        return await this.getVideoComments(node, inputData, apiKey, maxResults);
      case 'getTrendingVideos':
        return await this.getTrendingVideos(node, inputData, apiKey, maxResults);
      case 'getTranscript':
        return await this.getTranscript(node, inputData);
      default:
        throw new Error(`Unsupported YouTube operation: ${operation}`);
    }
  }

  private async searchVideos(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string,
    maxResults: number
  ): Promise<Record<string, any>> {
    const query = this.getParameter(node, 'query', '');
    const order = this.getParameter(node, 'order', 'relevance');
    const regionCode = this.getParameter(node, 'regionCode', 'US');
    const videoDuration = this.getParameter(node, 'videoDuration', 'any');
    const safeSearch = this.getParameter(node, 'safeSearch', 'moderate');

    if (!query) throw new Error('Search Query is required for Search Videos operation');

    const params: Record<string, any> = {
      key: apiKey,
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults,
      order,
      regionCode,
      safeSearch
    };

    if (videoDuration !== 'any') params.videoDuration = videoDuration;

    const response = await this.callYouTubeAPI('/search', params);

    const videos = response.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    return {
      ...inputData,
      operation: 'searchVideos',
      query,
      totalResults: response.pageInfo?.totalResults,
      resultsPerPage: response.pageInfo?.resultsPerPage,
      nextPageToken: response.nextPageToken,
      videos,
      count: videos.length
    };
  }

  private async getVideoDetails(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string
  ): Promise<Record<string, any>> {
    const videoId = this.getParameter(node, 'videoId', '');
    if (!videoId) throw new Error('Video ID is required for Get Video Details operation');

    const response = await this.callYouTubeAPI('/videos', {
      key: apiKey,
      part: 'snippet,statistics,contentDetails,status',
      id: videoId
    });

    if (!response.items || response.items.length === 0) {
      throw new Error(`No video found with ID: ${videoId}`);
    }

    const video = response.items[0];
    return {
      ...inputData,
      operation: 'getVideoDetails',
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      tags: video.snippet.tags || [],
      categoryId: video.snippet.categoryId,
      thumbnail: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url,
      duration: video.contentDetails?.duration,
      definition: video.contentDetails?.definition,
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      privacyStatus: video.status?.privacyStatus,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  private async getChannelDetails(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string
  ): Promise<Record<string, any>> {
    const channelId = this.getParameter(node, 'channelId', '');
    if (!channelId) throw new Error('Channel ID is required for Get Channel Details operation');

    const response = await this.callYouTubeAPI('/channels', {
      key: apiKey,
      part: 'snippet,statistics,brandingSettings',
      id: channelId
    });

    if (!response.items || response.items.length === 0) {
      throw new Error(`No channel found with ID: ${channelId}`);
    }

    const channel = response.items[0];
    return {
      ...inputData,
      operation: 'getChannelDetails',
      channelId,
      title: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl,
      country: channel.snippet.country,
      publishedAt: channel.snippet.publishedAt,
      thumbnail: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      url: `https://www.youtube.com/channel/${channelId}`
    };
  }

  private async listPlaylists(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string,
    maxResults: number
  ): Promise<Record<string, any>> {
    const channelId = this.getParameter(node, 'channelId', '');
    if (!channelId) throw new Error('Channel ID is required for List Playlists operation');

    const response = await this.callYouTubeAPI('/playlists', {
      key: apiKey,
      part: 'snippet,contentDetails',
      channelId,
      maxResults
    });

    const playlists = (response.items || []).map((item: any) => ({
      playlistId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      itemCount: item.contentDetails?.itemCount,
      url: `https://www.youtube.com/playlist?list=${item.id}`
    }));

    return {
      ...inputData,
      operation: 'listPlaylists',
      channelId,
      playlists,
      count: playlists.length,
      nextPageToken: response.nextPageToken
    };
  }

  private async getPlaylistItems(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string,
    maxResults: number
  ): Promise<Record<string, any>> {
    const playlistId = this.getParameter(node, 'playlistId', '');
    if (!playlistId) throw new Error('Playlist ID is required for Get Playlist Items operation');

    const response = await this.callYouTubeAPI('/playlistItems', {
      key: apiKey,
      part: 'snippet,contentDetails',
      playlistId,
      maxResults
    });

    const items = (response.items || []).map((item: any) => ({
      videoId: item.contentDetails?.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.videoOwnerChannelTitle,
      publishedAt: item.snippet.publishedAt,
      position: item.snippet.position,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.contentDetails?.videoId}`
    }));

    return {
      ...inputData,
      operation: 'getPlaylistItems',
      playlistId,
      items,
      count: items.length,
      totalResults: response.pageInfo?.totalResults,
      nextPageToken: response.nextPageToken
    };
  }

  private async getVideoComments(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string,
    maxResults: number
  ): Promise<Record<string, any>> {
    const videoId = this.getParameter(node, 'videoId', '');
    if (!videoId) throw new Error('Video ID is required for Get Video Comments operation');

    const response = await this.callYouTubeAPI('/commentThreads', {
      key: apiKey,
      part: 'snippet',
      videoId,
      maxResults,
      order: 'relevance'
    });

    const comments = (response.items || []).map((item: any) => {
      const topComment = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.id,
        text: topComment.textDisplay,
        authorName: topComment.authorDisplayName,
        authorChannelUrl: topComment.authorChannelUrl,
        likeCount: topComment.likeCount,
        publishedAt: topComment.publishedAt,
        replyCount: item.snippet.totalReplyCount
      };
    });

    return {
      ...inputData,
      operation: 'getVideoComments',
      videoId,
      comments,
      count: comments.length,
      totalResults: response.pageInfo?.totalResults,
      nextPageToken: response.nextPageToken
    };
  }

  private async getTrendingVideos(
    node: WorkflowNode,
    inputData: Record<string, any>,
    apiKey: string,
    maxResults: number
  ): Promise<Record<string, any>> {
    const regionCode = this.getParameter(node, 'regionCode', 'US');

    const response = await this.callYouTubeAPI('/videos', {
      key: apiKey,
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode,
      maxResults
    });

    const videos = (response.items || []).map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      duration: item.contentDetails?.duration,
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      url: `https://www.youtube.com/watch?v=${item.id}`
    }));

    return {
      ...inputData,
      operation: 'getTrendingVideos',
      regionCode,
      videos,
      count: videos.length
    };
  }

  private async getTranscript(
    node: WorkflowNode,
    inputData: Record<string, any>
  ): Promise<Record<string, any>> {
    let videoIdOrUrl = this.getParameter(node, 'videoId', '');
    
    // Basic interpolation for {{videoId}} or {{item.videoId}}
    if (videoIdOrUrl.includes('{{') && videoIdOrUrl.includes('}}')) {
      videoIdOrUrl = videoIdOrUrl.replace(/\{\{([^}]+)\}\}/g, (_: string, key: string) => {
        const path = key.replace(/^item\./, '').split('.');
        let current = inputData;
        for (const p of path) {
          if (current && typeof current === 'object') current = current[p];
          else return '';
        }
        return current || '';
      });
    }

    if (!videoIdOrUrl) throw new Error('Video ID or URL is required for Get Transcript operation');

    try {
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoIdOrUrl);
      const fullText = transcriptList.map(t => t.text).join(' ');
      
      return {
        ...inputData,
        operation: 'getTranscript',
        transcript: fullText,
        transcriptLength: fullText.length
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }
  }

  private async callYouTubeAPI(endpoint: string, params: Record<string, any>): Promise<any> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}${endpoint}`, { params });
      return response.data;
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      if (apiError) {
        throw new Error(`YouTube API Error ${apiError.code}: ${apiError.message}`);
      }
      throw new Error(`YouTube API request failed: ${error.message}`);
    }
  }
}
