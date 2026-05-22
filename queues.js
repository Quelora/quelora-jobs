/*
 * Quelora — quelora-jobs
 * Copyright (C) 2026 Germán Zelaya — https://quelora.org
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This file is part of Quelora. See the LICENSE file for terms.
 */

// filepath: packages/quelora-jobs/queues.js
const { createQueue } = require('@quelora/common/infrastructure/bullmq');
const { QUEUES }      = require('@quelora/common/constants/queues');

/**
 * Singleton queue instances to prevent opening multiple Redis connections
 * for the same queue during the scheduler lifecycle.
 */
const queuesInstance = {};

/**
 * Returns a Queue instance for the given name.
 * Creates it on first call, returns the cached instance on subsequent calls.
 *
 * @param {string} name - Queue name. Use a constant from QUEUES.
 * @returns {Queue}
 */
const getQueue = (name) => {
    if (!queuesInstance[name]) {
        queuesInstance[name] = createQueue(name);
    }
    return queuesInstance[name];
};

module.exports = { QUEUES, getQueue };