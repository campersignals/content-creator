-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keywords" TEXT NOT NULL,
    "blogText" TEXT NOT NULL,
    "instaText" TEXT NOT NULL,
    "tiktokText" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
