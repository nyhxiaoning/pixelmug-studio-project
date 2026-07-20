import OSS from 'ali-oss';
// 获取不同方式获取上传token：

import { getUploadTokenApi } from '@/api/works';

export const createOssClient = async (type: string) => {
  try {
    const response = await getUploadTokenApi(type);
    console.log('获取oss配置成功', response);
    return {
      client: new OSS({
        region: response.region,
        accessKeyId: response.accessKeyId,
        accessKeySecret: response.accessKeySecret,
        stsToken: response.token,
        bucket: response.bucketName,
      }),
      path: response.path,
      fullPath: response.fullPath,
    };
  } catch (err) {
    console.error('获取oss配置失败', err);
    throw new Error(err);
  }
};
