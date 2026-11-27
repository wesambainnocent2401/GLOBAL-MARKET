
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
    console.error(
      "GLOBAL MARKET: Appwrite configuration not found."
    );
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
    console.error(
      "GLOBAL MARKET: Missing Appwrite services."
    );
    return;
  }

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  async function getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      throw new Error(
        "Please log in before uploading advertisement media."
      );
    }
  }

  // ==========================================
  // VALIDATE FILE
  // ==========================================

  function validateFile(file) {
    if (!file) {
      throw new Error("Please select a file.");
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      throw new Error(
        "Only image and video files are supported."
      );
    }

    if (isVideo && file.size > CONFIG.MAX_VIDEO_SIZE) {
      throw new Error(
        "Video size cannot exceed 100 MB."
      );
    }

    if (isImage && file.size > CONFIG.MAX_PHOTO_SIZE) {
      throw new Error(
        "Photo size cannot exceed 10 MB."
      );
    }

    if (file.size === 0) {
      throw new Error("The selected file is empty.");
    }

    return isVideo ? "video" : "image";
  }

  // ==========================================
  // UPLOAD ONE MEDIA FILE
  // ==========================================

  async function uploadMedia(
    file,
    advertisementId,
    sortOrder = 0
  ) {
    if (!advertisementId) {
      throw new Error(
        "Advertisement ID is required."
      );
    }

    const user = await getCurrentUser();
    const mediaType = validateFile(file);

    const fileId = ID.unique();

    // Public viewing, owner-only file management.
    const filePermissions = [
      `read("any")`,
      `update("user:${user.$id}")`,
      `delete("user:${user.$id}")`
    ];

    let uploadedFile = null;

    try {
      // Upload to Appwrite Storage.
      uploadedFile = await storage.createFile({
        bucketId: CONFIG.BUCKET_ID,
        fileId: fileId,
        file: file,
        permissions: filePermissions
      });

      // Get the public file URL.
      const fileUrl = storage.getFileView({
        bucketId: CONFIG.BUCKET_ID,
        fileId: uploadedFile.$id
      }).toString();

      // Save media information in Appwrite Database.
      const mediaRecord = await tablesDB.createRow({
        databaseId: CONFIG.DATABASE_ID,
        tableId: CONFIG.MEDIA_TABLE_ID,
        rowId: ID.unique(),

        data: {
          advertisementId: advertisementId,
          ownerId: user.$id,
          mediaType: mediaType,
          fileUrl: fileUrl,
          thumbnailUrl:
            mediaType === "image" ? fileUrl : "",
          fileName: file.name,
          sortOrder: sortOrder
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
        fileUrl: fileUrl,
        mediaType: mediaType,
        fileName: file.name
      };

    } catch (error) {

      // Remove uploaded file if saving its record fails.
      if (uploadedFile && uploadedFile.$id) {
        try {
          await storage.deleteFile({
            bucketId: CONFIG.BUCKET_ID,
            fileId: uploadedFile.$id
          });

        } catch (cleanupError) {
          console.error(
            "GLOBAL MARKET: File cleanup failed:",
            cleanupError
          );
        }
      }

      console.error(
        "GLOBAL MARKET: Media upload failed:",
        error
      );

      throw error;
    }
  }

  // ==========================================
  // UPLOAD ALL ADVERTISEMENT MEDIA
  // ==========================================

  async function uploadAdvertisementMedia(
    advertisementId,
    photos = [],
    videos = []
  ) {
    if (!advertisementId) {
      throw new Error(
        "Advertisement ID is required."
      );
    }

    if (!Array.isArray(photos) || !Array.isArray(videos)) {
      throw new Error(
        "Invalid media selection."
      );
    }

    if (photos.length > CONFIG.MAX_PHOTOS) {
      throw new Error(
        "A maximum of 20 photos is allowed."
      );
    }

    if (videos.length < CONFIG.MIN_VIDEOS) {
      throw new Error(
        "Please select at least five videos."
      );
    }

    // Validate every file before uploading anything.
    photos.forEach(function (file) {
      if (validateFile(file) !== "image") {
        throw new Error(
          "Please select image files in the photos section."
        );
      }
    });

    videos.forEach(function (file) {
      if (validateFile(file) !== "video") {
        throw new Error(
          "Please select video files in the videos section."
        );
      }
    });

    const results = [];

    // Upload photos first.
    for (let i = 0; i < photos.length; i++) {
      const result = await uploadMedia(
        photos[i],
        advertisementId,
        i
      );

      results.push(result);
    }

    // Upload videos after photos.
    for (let i = 0; i < videos.length; i++) {
      const result = await uploadMedia(
        videos[i],
        advertisementId,
        photos.length + i
      );

      results.push(result);
    }

    return results;
  }

  // ==========================================
  // GET ADVERTISEMENT MEDIA
  // ==========================================

  async function getAdvertisementMedia(advertisementId) {
    if (!advertisementId) {
      throw new Error(
        "Advertisement ID is required."
      );
    }

    const result = await tablesDB.listRows({
      databaseId: CONFIG.DATABASE_ID,
      tableId: CONFIG.MEDIA_TABLE_ID,

      queries: [
        Query.equal(
          "advertisementId",
          advertisementId
        ),

        Query.orderAsc("sortOrder")
      ]
    });

    return result.rows || [];
  }

  // ==========================================
  // DELETE ONE MEDIA FILE AND ITS RECORD
  // ==========================================

  async function deleteAdvertisementMedia(
    mediaId,
    fileId
  ) {
    if (!mediaId || !fileId) {
      throw new Error(
        "Media record ID and file ID are required."
      );
    }

    await getCurrentUser();

    // Delete the database record first.
    await tablesDB.deleteRow({
      databaseId: CONFIG.DATABASE_ID,
      tableId: CONFIG.MEDIA_TABLE_ID,
      rowId: mediaId
    });

    // Then delete the storage file.
    await storage.deleteFile({
      bucketId: CONFIG.BUCKET_ID,
      fileId: fileId
    });

    return {
      success: true
    };
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  window.GMAdvertisementMedia = {
    uploadMedia,
    uploadAdvertisementMedia,
    getAdvertisementMedia,
    deleteAdvertisementMedia,
    getCurrentUser,
    validateFile,
    CONFIG
  };

  console.log(
    "GLOBAL MARKET: Advertisement media module loaded successfully."
  );

})();
