
/* ==========================================
   GLOBAL MARKET
   ADVERTISEMENT MEDIA MANAGEMENT
========================================== */

(function () {
  "use strict";

  const CONFIG = {
    BUCKET_ID: "advertisement_media",
    DATABASE_ID: "global_market_db",
    MEDIA_TABLE_ID: "advertisement_media",
    ADVERTISEMENTS_TABLE_ID: "advertisements",

    MAX_PHOTOS: 20,
    MIN_VIDEOS: 5,

    MAX_VIDEO_SIZE: 100 * 1024 * 1024,
    MAX_PHOTO_SIZE: 10 * 1024 * 1024
  };

  const GM = window.GMAppwrite;

  if (!GM) {
    console.error("GLOBAL MARKET: Appwrite configuration not found.");
    return;
  }

  const {
    account,
    storage,
    tablesDB,
    ID,
    Query
  } = GM;

  if (!account || !storage || !tablesDB || !ID || !Query) {
    console.error("GLOBAL MARKET: Missing Appwrite services.");
    return;
  }

  // Get the currently logged-in user.
  async function getCurrentUser() {
    try {
      return await account.get();
    } catch {
      throw new Error("Please log in before uploading media.");
    }
  }

  // Validate uploaded files.
  function validateFile(file) {
    if (!file) {
      throw new Error("No file selected.");
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      throw new Error("Only image and video files are supported.");
    }

    if (isVideo && file.size > CONFIG.MAX_VIDEO_SIZE) {
      throw new Error("Video exceeds the 100 MB limit.");
    }

    if (isImage && file.size > CONFIG.MAX_PHOTO_SIZE) {
      throw new Error("Image exceeds the 10 MB limit.");
    }

    return isVideo ? "video" : "image";
  }

  // Upload one advertisement media file.
  async function uploadMedia(file, advertisementId, sortOrder = 0) {
    const user = await getCurrentUser();

    if (!advertisementId) {
      throw new Error("Advertisement ID is required.");
    }

    const mediaType = validateFile(file);
    const fileId = ID.unique();

    // Individual file permissions.
    const permissions = [
      `read("any")`,
      `update("user:${user.$id}")`,
      `delete("user:${user.$id}")`
    ];

    // Upload file to Appwrite Storage.
    const uploadedFile = await storage.createFile({
      bucketId: CONFIG.BUCKET_ID,
      fileId,
      file,
      permissions
    });

    // Generate a file preview URL.
    const fileUrl = storage.getFileView({
      bucketId: CONFIG.BUCKET_ID,
      fileId: uploadedFile.$id
    }).toString();

    // Save the file information in the database.
    try {
      const mediaRecord = await tablesDB.createRow({
        databaseId: CONFIG.DATABASE_ID,
        tableId: CONFIG.MEDIA_TABLE_ID,
        rowId: ID.unique(),
        data: {
          advertisementId,
          ownerId: user.$id,
          mediaType,
          fileUrl,
          thumbnailUrl: mediaType === "image" ? fileUrl : "",
          fileName: file.name,
          sortOrder
        },
        permissions: [
          `read("any")`,
          `update("user:${user.$id}")`,
          `delete("user:${user.$id}")`
        ]
      });

      return {
        success: true,
        fileId: uploadedFile.$id,
        mediaId: mediaRecord.$id,
        fileUrl,
        mediaType,
        fileName: file.name
      };

    } catch (error) {
      // Avoid leaving an unreferenced storage file.
      try {
        await storage.deleteFile({
          bucketId: CONFIG.BUCKET_ID,
          fileId: uploadedFile.$id
        });
      } catch (cleanupError) {
        console.error("Media cleanup failed:", cleanupError);
      }

      throw error;
    }
  }

  // Upload multiple photos and videos.
  async function uploadAdvertisementMedia(
    advertisementId,
    photos = [],
    videos = []
  ) {
    if (photos.length > CONFIG.MAX_PHOTOS) {
      throw new Error("Maximum 20 photos are allowed.");
    }

    if (videos.length < CONFIG.MIN_VIDEOS) {
      throw new Error("Please select at least five videos.");
    }

    const results = [];

    for (let i = 0; i < photos.length; i++) {
      results.push(
        await uploadMedia(photos[i], advertisementId, i)
      );
    }

    for (let i = 0; i < videos.length; i++) {
      results.push(
        await uploadMedia(
          videos[i],
          advertisementId,
          photos.length + i
        )
      );
    }

    return results;
  }

  // Retrieve media belonging to an advertisement.
  async function getAdvertisementMedia(advertisementId) {
    if (!advertisementId) {
      throw new Error("Advertisement ID is required.");
    }

    const result = await tablesDB.listRows({
      databaseId: CONFIG.DATABASE_ID,
      tableId: CONFIG.MEDIA_TABLE_ID,
      queries: [
        Query.equal("advertisementId", advertisementId),
        Query.orderAsc("sortOrder")
      ]
    });

    return result.rows;
  }

  // Public API.
  window.GMAdvertisementMedia = {
    uploadMedia,
    uploadAdvertisementMedia,
    getAdvertisementMedia,
    getCurrentUser,
    CONFIG
  };

  console.log("GLOBAL MARKET: Advertisement media module loaded.");

})();
