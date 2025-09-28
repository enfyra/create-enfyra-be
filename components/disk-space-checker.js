const checkDiskSpace = require('check-disk-space').default;
const path = require('path');

async function checkDiskSpaceAvailable(projectPath) {
    const drive = path.parse(projectPath).root;
    const MIN_REQUIRED_SPACE = 1 * 1024 * 1024 * 1024; // 1 GB

    try {
        const diskSpace = await checkDiskSpace(drive);
        
        const result = {
            free: diskSpace.free,
            total: diskSpace.size,
            required: MIN_REQUIRED_SPACE,
            hasEnoughSpace: diskSpace.free >= MIN_REQUIRED_SPACE,
            freeGB: (diskSpace.free / 1024 / 1024 / 1024).toFixed(2),
            requiredGB: MIN_REQUIRED_SPACE / 1024 / 1024 / 1024
        };

        if (!result.hasEnoughSpace) {
            throw new Error(
                `Not enough space.\n` +
                `Need at least: ${result.requiredGB} GB\n` +
                `Currently available: ${result.freeGB} GB\n` +
                `Please free up more ${(result.requiredGB - result.freeGB).toFixed(2)} GB to continue.`
            );
        }

        return result;
    } catch (error) {
        throw new Error(`Error checking disk space: ${error.message}`);
    }
}

module.exports = {
    checkDiskSpaceAvailable
};