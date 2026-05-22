/*
 * Quelora — quelora-jobs
 * Copyright (C) 2026 Germán Zelaya — https://quelora.org
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of Quelora. See the LICENSE file for terms.
 */

/* filepath: packages/quelora-jobs/index.js */
require('dotenv').config();
const connectDB = require('@quelora/common/db');
const { runFullSync } = require('./scheduler');

/**
 * Service Entrypoint.
 * Connects to DB and triggers the synchronization.
 */
const start = async () => {
    try {
        await connectDB();
        
        // Initial Sync on startup
        await runFullSync();
        
        console.log('🚀 Scheduler Service is ready and waiting.');
        
        // Periodic Re-sync (every 10 minutes)
        // This acts as a safety net for any manual DB changes that didn't trigger an event.
        setInterval(runFullSync, 600 * 1000);

    } catch (error) {
        console.error('❌ Scheduler Start Error:', error);
        process.exit(1);
    }
};

// Start if executed directly
if (require.main === module) {
    start();
}

module.exports = { runFullSync };