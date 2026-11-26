/* =========================================
   GLOBAL MARKET - APPWRITE CONFIGURATION
   Public browser configuration only.
   Never place an Appwrite API key in this file.
========================================= */

(function () {
    "use strict";

    if (!window.Appwrite) {
        console.error(
            "Appwrite SDK did not load. Add the Appwrite SDK script before appwrite-config.js."
        );
        return;
    }

    const client = new Appwrite.Client();

    client
        .setEndpoint("https://nyc.cloud.appwrite.io/v1")
        .setProject("6b0548a000000741aa1c");

    const account = new Appwrite.Account(client);
    const tablesDB = new Appwrite.TablesDB(client);
    const storage = new Appwrite.Storage(client);

    window.GMAppwrite = Object.freeze({
        client: client,
        account: account,
        tablesDB: tablesDB,
        storage: storage,
        ID: Appwrite.ID,
        Query: Appwrite.Query
    });

    console.info("GLOBAL MARKET Appwrite client initialized.");
})();
