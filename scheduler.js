/*
 * Quelora — quelora-jobs
 * Copyright (C) 2026 Germán Zelaya — https://quelora.org
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of Quelora. See the LICENSE file for terms.
 */

/* filepath: packages/quelora-jobs/scheduler.js */
const Client = require('@quelora/common/models/Client');
const { QUEUES, getQueue } = require('./queues');

/**
 * 1. CORE CONFIGURATION (Always Active)
 * Default settings for baseline system jobs.
 */
const DEFAULTS = {
    reputation: { enabled: true, cronExpression: '*/30 * * * * *' },
    suggestion: { enabled: true, cronExpression: '0 2 * * *' },
    activity:   { enabled: true, cronExpression: '*/10 * * * * *' },
    'gravity-decay': { enabled: true, cronExpression: '*/30 * * * *' }
};

const CORE_JOBS = [
    { key: 'reputation', queueName: QUEUES.REPUTATION },
    { key: 'suggestion', queueName: QUEUES.SUGGESTION },
    { key: 'activity',   queueName: QUEUES.ACTIVITY },
    { key: 'gravity-decay', queueName: QUEUES.GRAVITY }
];

/**
 * 2. DYNAMIC ENTERPRISE LOADING
 * Attempts to load additional jobs from the optional enterprise plugin.
 */
let ENTERPRISE_JOBS = [];
try {
    console.log('🔍 [Scheduler] Attempting to load @quelora/enterprise...');
    const enterprise = require('@quelora/enterprise');
    
    if (enterprise && Array.isArray(enterprise.jobs)) {
        ENTERPRISE_JOBS = enterprise.jobs;
        console.log(`💼 [Scheduler] Enterprise Plugin Loaded successfully. Jobs found: ${ENTERPRISE_JOBS.map(j => j.key).join(', ')}`);
    } else {
        console.warn('⚠️ [Scheduler] @quelora/enterprise module loaded, but "jobs" export is missing or empty.');
        console.log('Keys found in enterprise package:', Object.keys(enterprise));
    }
} catch (e) {
    console.log(`ℹ️ [Scheduler] Enterprise module could not be loaded: ${e.message}`);
}

const SUPPORTED_JOBS = [...CORE_JOBS, ...ENTERPRISE_JOBS];

/**
 * 3. HELPERS
 */

/**
 * Retrieves the specific job configuration from a client's job configuration object/map.
 * @param {Object|Map} jobsConfig - The configuration source from the client.
 * @param {string} key - The job identifier.
 * @returns {Object|null}
 */
const getJobConfig = (jobsConfig, key) => {
    if (!jobsConfig) return null;
    if (typeof jobsConfig.get === 'function') return jobsConfig.get(key); // Handles Map types
    return jobsConfig[key]; // Handles standard Objects
};

/**
 * 4. SYNCHRONIZATION LOGIC
 */

/**
 * Synchronizes recurring jobs for a specific client based on their custom config and system defaults.
 * @param {Object} client - The client document from the database.
 */
const syncClientJobs = async (client) => {
    const { cid, jobsConfig } = client;

    for (const jobDef of SUPPORTED_JOBS) {
        let config = getJobConfig(jobsConfig, jobDef.key);
        
        // Fallback A: Use Hardcoded Core Defaults
        if (!config && DEFAULTS[jobDef.key]) {
            config = DEFAULTS[jobDef.key];
        }

        // Fallback B: Use Enterprise Plugin Defaults (if available in definition)
        if (!config && jobDef.cronExpression) {
             config = {
                 enabled: jobDef.enabled !== false,
                 cronExpression: jobDef.cronExpression
             };
        }

        const queueName = jobDef.queueName || QUEUES.ENTERPRISE;
        const queue = getQueue(queueName);
        const uniqueJobId = `cron:${cid}:${jobDef.key}`; 

        if (config && config.enabled && config.cronExpression) {
            // Schedule or Update the repeatable job
            await queue.add(
                jobDef.key, 
                { cid, type: jobDef.key }, 
                {
                    repeat: { pattern: config.cronExpression },
                    jobId: uniqueJobId,
                    removeOnComplete: true,
                    removeOnFail: 100 
                }
            );
        } else {
            // Clean up jobs that are now disabled or missing configuration
            const repeatables = await queue.getRepeatableJobs();
            const existing = repeatables.find(j => j.id === uniqueJobId);
            if (existing) {
                await queue.removeRepeatableByKey(existing.key);
                console.log(`🗑️ [${cid}] Removed disabled job: ${jobDef.key}`);
            }
        }
    }
};

/**
 * Configures global system maintenance jobs.
 */
const syncSystemJobs = async () => {
    const queue = getQueue(QUEUES.SYSTEM);
    
    await queue.add('stats-rollup', {}, { repeat: { pattern: '*/5 * * * *' }, jobId: 'sys:stats-rollup' });
    await queue.add('profile-stats', {}, { repeat: { pattern: '*/15 * * * *' }, jobId: 'sys:profile-stats' });
    await queue.add('geo-update', {}, { repeat: { pattern: '0 4 * * *' }, jobId: 'sys:geo-update' });
    await queue.add('token-usage-rollup', {}, { repeat: { pattern: '*/5 * * * *' }, jobId: 'sys:token-usage' });
    await queue.add('daily-rollup', {}, { repeat: { pattern: '5 1 * * *' }, jobId: 'sys:daily-rollup' });
};

/**
 * Iterates through all clients and system tasks to ensure the task scheduler matches the database state.
 */
const runFullSync = async () => {
    console.log('🔄 [Scheduler] Starting full synchronization...');
    await syncSystemJobs();
    
    const clients = await Client.find({});
    for (const client of clients) {
        await syncClientJobs(client);
    }
    console.log(`✅ [Scheduler] Sync Complete. Processed ${clients.length} clients.`);
};

module.exports = { runFullSync, syncClientJobs };