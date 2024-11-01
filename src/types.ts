export type SpecificResponse = {
	kind: "youtube#videoListResponse",
	etag: string,

	items: {
		kind: "youtube#video",
		etag: string,
		id: string,
		snippet: YoutubeSnippet,
		liveStreamingDetails: YoutubeLiveStreamingDetails
	}[]

	pageInfo: {
		totalResults: number,
		resultsPerPage: number
	}
}

export type SearchResponse = {
	"kind": "youtube#searchListResponse",
	"etag": string,
	"nextPageToken": string,
	"prevPageToken": string,
	"regionCode": string,
	"pageInfo": {
		"totalResults": number,
		"resultsPerPage": number
	},
	"items": {
		"kind": "youtube#searchResult",
		"etag": string,
		"id": {
			"kind": string,
			"videoId": string,
			"channelId": string,
			"playlistId": string
		},
		"snippet": {
			"publishedAt": string,
			"channelId": string,
			"title": string,
			"description": string,
			"thumbnails": YoutubeThumbnails,
			"channelTitle": string,
			"liveBroadcastContent": string
		}
	}[]
}

export type PlayListResponse = {
	"kind": "youtube#playlistItemListResponse",
	"etag": string,
	"nextPageToken"?: string,
	"prevPageToken"?: string,
	"pageInfo": {
		"totalResults": number,
		"resultsPerPage": number
	},
	"items": {
		"kind": "youtube#playlistItem",
		"etag": string,
		/* this is the long id, not the short video one */
		"id": string
		"snippet"?: {
			"publishedAt": string,
			"channelId": string,
			"title": string,
			"description": string,
			"thumbnails": YoutubeThumbnails,
			"channelTitle": string,
			playlistId: string,
			position: number,
			resourceId: {
				kind: "youtube#video",
				videoId: string
			},
			videoOwnerChannelTitle: string,
			videoOwnerChannelId: string
		},
		"contentDetails"?: {
			videoId: string,
			videoPublishedAt: string
		},
		"status"?: {
			privacyStatus: "public" | "unlisted" | "private"
		}
	}[]
}

export type YoutubeSnippet = {
	publishedAt: string,
	channelId: string,
	title: string,
	description?: string,
	thumbnails: YoutubeThumbnails,
	channelTitle: string,
	tags?: string[],
	categoryId?: string,
	liveBroadcastContent?: "none" | "upcoming" | "live",
	localized?: {
		title: string,
		description: string
	}
}

export type YoutubeThumbnails = {
	default?: YoutubeThumbnail,
	medium?: YoutubeThumbnail,
	high?: YoutubeThumbnail,
	standard?: YoutubeThumbnail,
	maxres?: YoutubeThumbnail
}

export type YoutubeThumbnail = {
	url: string,
	width: number,
	height: number,
}

export type YoutubeLiveStreamingDetails = {
	"actualStartTime"?: string,
	"actualEndTime"?: string,
	"scheduledStartTime"?: string,
	"scheduledEndTime"?: string,
	"concurrentViewers"?: number
	"activeLiveChatId"?: string
}
