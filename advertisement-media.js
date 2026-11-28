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

        MIN_PHOTOS: 2,
        MAX_PHOTOS: 20,

        MIN_VIDEOS: 1,
        MAX_VIDEOS: 10,

        MAX_PHOTO_SIZE: 5 * 1024 * 1024,
        MAX_VIDEO_SIZE: 50 * 1024 * 1024,

        // Common video formats.
        VIDEO_EXTENSIONS: [
            "mp4",
            "mov",
            "m4v",
            "webm",
            "ogv",
            "ogg",
            "avi",
            "mkv",
            "3gp",
            "mpeg",
            "mpg",
            "wmv",
            "flv",
            "ts"
        ]
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

    // ==========================================
    // PERMISSIONS
    // ==========================================

    function privatePermissions(userId) {
        return [
            `read("user:${userId}")`,
            `update("user:${userId}")`,
            `delete("user:${userId}")`
        ];
    }

    function publicPermissions(userId) {
        return [
            `read("any")`,
            `update("user:${userId}")`,
            `delete("user:${userId}")`
        ];
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
    // CHECK VIDEO FORMAT
    // ==========================================

    function isSupportedVideo(file) {
        if (!file) return false;

        const mimeType = (file.type || "").toLowerCase();

        const extension = file.name
            .split(".")
            .pop()
            .toLowerCase();

        return (
            mimeType.startsWith("video/") ||
            CONFIG.VIDEO_EXTENSIONS.includes(extension)
        );
    }

    // ==========================================
    // VALIDATE FILE
    // ==========================================

    function validateFile(file) {
        if (!file) {
            throw new Error("Please select a file.");
        }

        if (file.size === 0) {
            throw new Error("The selected file is empty.");
        }

        const mimeType = (file.type || "").toLowerCase();

        if (
            mimeType.startsWith("image/") ||
            /\.(jpg|jpeg|png|gif)$/i.test(file.name)
        ) {
            const extension = file.name
                .split(".")
                .pop()
                .toLowerCase();

            const supportedImages = [
                "jpg",
                "jpeg",
                "png",
                "gif"
            ];

            if (!supportedImages.includes(extension)) {
                throw new Error(
                    "Only JPG, PNG and GIF photos are accepted."
                );
            }

            if (file.size > CONFIG.MAX_PHOTO_SIZE) {
                throw new Error(
                    "Each photo must be 5 MB or smaller."
                );
            }

            return "image";
        }

        if (isSupportedVideo(file)) {
            if (file.size > CONFIG.MAX_VIDEO_SIZE) {
                throw new Error(
                    "Each video must be 50 MB or smaller."
                );
            }

            return "video";
        }

        throw new Error(
            "Unsupported file. Select a JPG, PNG, GIF photo or a supported video."
        );
    }

    // ==========================================
    // UPLOAD ONE MEDIA FILE
    // Files remain private initially.
    // ==========================================

    async function uploadMedia(file, advertisementId, sortOrder = 0) {
        if (!advertisementId) {
            throw new Error("Advertisement ID is required.");
        }

        const user = await getCurrentUser();
        const mediaType = validateFile(file);

        const fileId = ID.unique();

        let uploadedFile = null;

        try {
            uploadedFile = await storage.createFile({
                bucketId: CONFIG.BUCKET_ID,
                fileId: fileId,
                file: file,
                permissions: privatePermissions(user.$id)
            });

            const fileUrl = storage.getFileView({
                bucketId: CONFIG.BUCKET_ID,
                fileId: uploadedFile.$id
            }).toString();

            const mediaRecord = await tablesDB.createRow({
                databaseId: CONFIG.DATABASE_ID,
                tableId: CONFIG.MEDIA_TABLE_ID,
                rowId: ID.unique(),

                data: {
                    advertisementId: advertisementId,
                    ownerId: user.$id,
                    mediaType: mediaType,
                    fileUrl: fileUrl,
                    thumbnailUrl: mediaType === "image" ? fileUrl : "",
                    fileName: file.name,
                    sortOrder: sortOrder
                },

                permissions: privatePermissions(user.$id)
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

            if (uploadedFile && uploadedFile.$id) {
                try {
                    await storage.deleteFile({
                        bucketId: CONFIG.BUCKET_ID,
                        fileId: uploadedFile.$id
                    });
                } catch (cleanupError) {
                    console.error(
                        "File cleanup failed:",
                        cleanupError
                    );
                }
            }

            console.error("Media upload failed:", error);
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
            throw new Error("Advertisement ID is required.");
        }

        if (!Array.isArray(photos) || !Array.isArray(videos)) {
            throw new Error("Invalid media selection.");
        }

        if (
            photos.length < CONFIG.MIN_PHOTOS ||
            photos.length > CONFIG.MAX_PHOTOS
        ) {
            throw new Error(
                "Upload at least 2 photos and no more than 20 photos."
            );
        }

        if (
            videos.length < CONFIG.MIN_VIDEOS ||
            videos.length > CONFIG.MAX_VIDEOS
        ) {
            throw new Error(
                "Upload at least 1 video and no more than 10 videos."
            );
        }

        // Validate every file before starting uploads.

        photos.forEach(file => {
            if (validateFile(file) !== "image") {
                throw new Error("Invalid photo selected.");
            }
        });

        videos.forEach(file => {
            if (validateFile(file) !== "video") {
                throw new Error("Invalid video selected.");
            }
        });

        const results = [];

        try {

            // Upload photos.
            for (let i = 0; i < photos.length; i++) {
                results.push(
                    await uploadMedia(
                        photos[i],
                        advertisementId,
                        i
                    )
                );
            }

            // Upload videos.
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

        } catch (error) {

            // Clean up files already uploaded in this batch.
            for (const media of results) {
                try {
                    await deleteAdvertisementMedia(
                        media.mediaId,
                        media.fileId
                    );
                } catch (cleanupError) {
                    console.error(
                        "Uploaded media cleanup failed:",
                        cleanupError
                    );
                }
            }

            throw error;
        }
    }

    // ==========================================
    // PUBLISH MEDIA
    // Called only after successful submission.
    // ==========================================

    async function publishAdvertisementMedia(
        advertisementId,
        uploadedMedia
    ) {
        if (!advertisementId || !Array.isArray(uploadedMedia)) {
            throw new Error(
                "Invalid advertisement publishing request."
            );
        }

        const user = await getCurrentUser();

        for (const media of uploadedMedia) {

            if (!media.fileId || !media.mediaId) {
                throw new Error(
                    "An uploaded media reference is missing."
                );
            }

            await storage.updateFile({
                bucketId: CONFIG.BUCKET_ID,
                fileId: media.fileId,
                permissions: publicPermissions(user.$id)
            });

            await tablesDB.updateRow({
                databaseId: CONFIG.DATABASE_ID,
                tableId: CONFIG.MEDIA_TABLE_ID,
                rowId: media.mediaId,
                data: {},
                permissions: publicPermissions(user.$id)
            });
        }

        return {
            success: true,
            advertisementId: advertisementId,
            publishedMediaCount: uploadedMedia.length
        };
    }

    // ==========================================
    // GET ADVERTISEMENT MEDIA
    // ==========================================

    async function getAdvertisementMedia(advertisementId) {
        if (!advertisementId) {
            throw new Error("Advertisement ID is required.");
        }

        const result = await tablesDB.listRows({
            databaseId: CONFIG.DATABASE_ID,
            tableId: CONFIG.MEDIA_TABLE_ID,

            queries: [
                Query.equal("advertisementId", advertisementId),
                Query.orderAsc("sortOrder"),
                Query.limit(100)
            ]
        });

        return result.rows || [];
    }

    // ==========================================
    // DELETE ONE MEDIA FILE AND RECORD
    // ==========================================

    async function deleteAdvertisementMedia(mediaId, fileId) {
        if (!mediaId || !fileId) {
            throw new Error(
                "Media record ID and file ID are required."
            );
        }

        await getCurrentUser();

        await tablesDB.deleteRow({
            databaseId: CONFIG.DATABASE_ID,
            tableId: CONFIG.MEDIA_TABLE_ID,
            rowId: mediaId
        });

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

    window.GMAdvertisementMedia = Object.freeze({
        uploadMedia,
        uploadAdvertisementMedia,
        publishAdvertisementMedia,
        getAdvertisementMedia,
        deleteAdvertisementMedia,
        getCurrentUser,
        validateFile,
        CONFIG
    });

    console.log(
        "GLOBAL MARKET: Advertisement media module loaded successfully."
    );

})();
