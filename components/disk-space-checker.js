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
                `Không đủ dung lượng trống.\n` +
                `Cần ít nhất: ${result.requiredGB} GB\n` +
                `Hiện còn trống: ${result.freeGB} GB\n` +
                `Vui lòng giải phóng thêm ${(result.requiredGB - result.freeGB).toFixed(2)} GB để tiếp tục.`
            );
        }

        return result;
    } catch (error) {
        throw new Error(`Lỗi kiểm tra dung lượng ổ đĩa: ${error.message}`);
    }
}

module.exports = {
    checkDiskSpaceAvailable
};