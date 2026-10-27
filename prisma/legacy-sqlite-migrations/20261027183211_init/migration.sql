-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "budget" DECIMAL,
    "description" TEXT,
    "icon" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "destinationId" TEXT,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "consumption" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockHolding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "shares" DECIMAL NOT NULL,
    "averagePrice" DECIMAL NOT NULL,
    "currentPrice" DECIMAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "accountId" TEXT,
    "priceSource" TEXT NOT NULL DEFAULT 'Manual',
    "lastPriceUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockHolding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FixedDeposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankName" TEXT NOT NULL,
    "principal" DECIMAL NOT NULL,
    "annualRate" DECIMAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "maturityDate" DATETIME NOT NULL,
    "frequency" TEXT NOT NULL,
    "accountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FixedDeposit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SplitTracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "friendId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "recoverable" DECIMAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SplitTracker_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Friend" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SplitTracker_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "splitId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settlement_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "SplitTracker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'local',
    "reportingPeriod" TEXT NOT NULL DEFAULT 'month',
    "defaultPayment" TEXT NOT NULL DEFAULT 'Other'
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- CreateIndex
CREATE INDEX "Transaction_date_type_idx" ON "Transaction"("date", "type");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_name_key" ON "Friend"("name");

-- CreateIndex
CREATE INDEX "SplitTracker_friendId_date_idx" ON "SplitTracker"("friendId", "date");

-- CreateIndex
CREATE INDEX "Settlement_splitId_idx" ON "Settlement"("splitId");
