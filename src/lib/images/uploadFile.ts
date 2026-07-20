import {
  binFileName,
  defaultGifName,
  defaultImageSize,
  doodleImgFileName,
  doodleJsonFileName,
} from './Common.ts';
import {
  colorsToBlob,
  colorsToJsonBlob,
  compressImageTo64x16,
  convertHexArrayToPng,
  convertImageToRGB565,
  convertRgb565BlobToPng,
} from './rgb.ts';

import { createOssClient } from './AliOSS.ts';
import { useAppI18n } from '@@/composables/useI18n'

// 上传图片的逻辑
export enum UploadFileEnum {
  IMAGE = 7, //图片 封面图 COVER_IMAGE
  GIF = 8, //GIF GIF_FILE
  EDITABLE_JSON = 9,// EDITABLE_JSON 编辑json
  STATIC_BIN = 10, //STATIC_BIN 静态图

  OTHER = 11, //其他文件
  BASE64IMG = 12, //BASE64图片，这里使用7和12是一个BASE

}

// export enum UploadFileEnum {
//     IMAGE = 7, //图片
//     GIF = 8, //GIF
//     BIN = 9, //二进制文件
//     OTHER = 10, //其他文件
//     BASE64IMG = 11, //BASE64图片
// }

export interface AddArtifactParam {
  //作品ID，新增时可以不传，修改时必传
  uuid?: string;

  fileUrl: string;
  //源文件大小
  fileSize: number;
  //二进制文件地址
  binFileUrl?: string;
  //二进制文件大小
  binSize?: number;
  //作品类型 0:静态图 1:动图 2:涂鸦
  type: number;
  //封面
  cover: string;
  // 标签
  // projectTag?: string; // 是否是涂鸦查询，还是其他是 PixelArt 或 Unfold
}


export const uploadImage = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      let fileType = '';
      console.log('file.type',file.type)
      console.log(file.type === 'image/jpeg',)

      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        // alert('file')
        fileType = "STATIC_BIN"
      }

      const uploadImgRes = await uploadFile(file, file.name, fileType);

      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      const uploadBinRes = await uploadFile(imgBlob, binFileName, fileType);
      const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(pngDefailt, file.name, fileType);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        binFileUrl: uploadBinRes.fileUrl,
        binSize: uploadBinRes.fileSize,
        cover: pngFileUpload.fileUrl,
        // type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};



export const uploadStaticImgCover = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      alert(file.type)
      const uploadImgRes = await uploadFile(file, file.name, 'COVER_IMAGE');
      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      // const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      // const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      // const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      // const pngFileUpload = await uploadFile(pngDefailt, file.name, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        // binFileUrl: uploadBinRes.fileUrl,
        // binSize: uploadBinRes.fileSize,
        // cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};



export const uploadPixelJSON = (data: any): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
  
      const uploadImgRes = await uploadeditorJson(JSON.stringify(data), data?.name, 'EDITABLE_JSON');
      console.log(uploadImgRes, 'uploadPixelJSON')
      // const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      // const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      // const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      // const pngFileUpload = await uploadFile(pngDefailt, file.name, UploadFileEnum.IMAGE);
      resolve({
        originData:data,
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        // binFileUrl: uploadBinRes.fileUrl,
        // binSize: uploadBinRes.fileSize,
        // cover: pngFileUpload.fileUrl,
        // type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};


export const uploadGifCover = (file: File): Promise<any> => {
  // alert('uploadImage');

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // const { t } = useAppI18n()
      // 判断一下，file.type
      alert(file.type)
      const uploadImgRes = await uploadFile(file, file.name, 'COVER_IMAGE');
      console.log(uploadImgRes, 'uploadImgResuploadImgRes')
      // const imgBlob = await convertImageToRGB565(file, UploadFileEnum.IMAGE);
      // const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      // const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      // const pngFileUpload = await uploadFile(pngDefailt, file.name, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: uploadImgRes.fileUrl,
        fileSize: uploadImgRes.fileSize,
        // binFileUrl: uploadBinRes.fileUrl,
        // binSize: uploadBinRes.fileSize,
        // cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const uploadBase64Image = (file: string): Promise<AddArtifactParam> => {
  // alert('uploadBase64Image');
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const uploadBase64String = await compressImageTo64x16(file);
      const imgBlob = await convertImageToRGB565(uploadBase64String, UploadFileEnum.BASE64IMG);
      const uploadBinRes = await uploadFile(imgBlob, binFileName, UploadFileEnum.BIN);
      const pngDefailt = await convertRgb565BlobToPng(imgBlob, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(pngDefailt, doodleImgFileName, UploadFileEnum.IMAGE);
      resolve({
        fileUrl: pngFileUpload.fileUrl,
        fileSize: pngFileUpload.fileSize,
        binFileUrl: uploadBinRes.fileUrl,
        binSize: uploadBinRes.fileSize,
        cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.IMAGE,
      });
    } catch (error) {
      reject(error);
    }
  });
};
const uploadFile = (file: any, name: string, uploadType: string): Promise<FileResponse> => {

  // alert('uploadFile');
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 配置当前的类型：
      alert(uploadType)
      const ossConfig = await createOssClient(uploadType);
      const fileName = ossConfig.path + '/' + name;
      const uploadResponse = await ossConfig.client.put(fileName, file, {});
      resolve({
        fileUrl: ossConfig.fullPath + '/' + name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('上传失败:', err);
      reject(err);
    }
  });
};



const uploadeditorJson = (file: any, name: string, uploadType: string): Promise<FileResponse> => {
  // alert('uploadFile');
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // 配置当前的类型：
      alert(uploadType)
      const ossConfig = await createOssClient(uploadType);
      const fileName = ossConfig.path + '/' + name;
      // const uploadResponse = await ossConfig.client.put(fileName, file, {});
      resolve({
        fileUrl: ossConfig.fullPath + '/' + name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('上传失败:', err);
      reject(err);
    }
  });
};

export const uploadDoodle = (colors: Array<string>): Promise<AddArtifactParam> => {
  // alert('uploadDoodle');
  // const { t } = useAppI18n()
  console.log('上传涂鸦colors is', colors[0]);
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const jsonBlob = colorsToJsonBlob(colors);
      const jsonFileUpload = await uploadFile(jsonBlob, doodleJsonFileName, UploadFileEnum.OTHER);
      const doodleImgBlob = await convertHexArrayToPng(colors, defaultImageSize.width, defaultImageSize.height);
      const pngFileUpload = await uploadFile(doodleImgBlob, doodleImgFileName, UploadFileEnum.IMAGE);
      const colorBlob = colorsToBlob(colors);
      const binFileUpload = await uploadFile(colorBlob, binFileName, UploadFileEnum.BIN);

      resolve({
        fileUrl: jsonFileUpload.fileUrl,
        fileSize: jsonFileUpload.fileSize,
        binFileUrl: binFileUpload.fileUrl,
        binSize: binFileUpload.fileSize,
        cover: pngFileUpload.fileUrl,
        type: AllowedArtifactTypes.DOODLE,
      });
    } catch (err) {
      console.error('上传涂鸦失败:', err);
      reject(err);
    }
  });
};

export const uploadGif = (file: File): Promise<AddArtifactParam> => {
  // const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    uploadFile(file, defaultGifName, UploadFileEnum.GIF)
      .then((gifResponse) => {
        resolve({
          fileUrl: gifResponse.fileUrl,
          fileSize: gifResponse.fileSize,
          cover: gifResponse.fileUrl,
          type: AllowedArtifactTypes.GIF,
        });
      })
      .catch((err) => {
        console.error('上传图片到oss失败:', err);
        reject(err);
      });
  });
};

export const checkFile = async (file: any) => {
  // alert('checkFile');
  let { t } = useAppI18n()
  console.log('checkFilekkkk');
  const fileType = file.type;
  if (fileType === 'image/jpeg' || fileType === 'image/png') {
    if (checkFileSize(file, AllowedArtifactTypes.IMAGE)) {
      throw new Error(t('common.imgSizeError'));
    }
    const img = await getImageDimensions(file);
    const ratio = img.width / img.height;
    if (Math.abs(ratio - 4) > 0.01) {
      throw new Error(t('common.imgSpecsError'));
    }
    return Promise.resolve();
  } else if (fileType === 'image/gif') {
    if (checkFileSize(file, AllowedArtifactTypes.GIF)) {
      throw new Error(t('common.gifSizeError'));
    }
    return isGifSizeValid(file).then((resut) => {
      if (resut) {
        throw new Error(t('common.gifSpecsError'));
      }
    });
  } else {
    throw new Error(t('common.fileTypeError'));
  }
};

export const uploadUserFile = (file: any, fileType: UploadFileEnum): Promise<FileResponse> => {
  const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    // alert('uploadUserFile');
    if (fileType === UploadFileEnum.BASE64IMG) {
      resolve(uploadBase64Image(file));
    } else {
      const fileType = file.type;
      if (fileType === 'image/jpeg' || fileType === 'image/png') {
        if (checkFileSize(file, AllowedArtifactTypes.IMAGE)) {
          reject(new Error(t('common.imgSizeError')));
        }
        getImageDimensions(file)
          .then((img) => {
            const ratio = img.width / img.height;
            if (Math.abs(ratio - 4) > 0.01) {
              reject(new Error(t('common.imgSpecsError')));
              return;
            }
            resolve(uploadImage(file));
          })
          .catch(() => {
            reject(new Error(t('common.imgSpecsError')));
          });
      } else if (fileType === 'image/gif') {
        if (checkFileSize(file, AllowedArtifactTypes.GIF)) {
          reject(new Error(t('common.gifSizeError')));
        }
        isGifSizeValid(file)
          .then((resut) => {
            if (resut) {
              reject(new Error(t('common.gifSpecsError')));
            }
            resolve(uploadGif(file));
          })
          .catch((err) => {
            reject(new Error(t('common.gifSpecsError')));
          });
      } else {
        throw new Error(t('common.fileTypeError'));
      }
    }
  });
};

export const uploadMutFile = (file: File): Promise<FileResponse> => {
  const { t } = useAppI18n()
  return new Promise((resolve, reject) => {
    const fileType = file.type;
    if (fileType === 'image/jpeg' || fileType === 'image/png') {
      if (checkFileSize(file, AllowedArtifactTypes.IMAGE)) {
        reject(new Error(t('common.imgSizeError')));
      }
      resolve(uploadImage(file));
    } else if (fileType === 'image/gif') {
      if (checkFileSize(file, AllowedArtifactTypes.GIF)) {
        reject(new Error(t('common.gifSizeError')));
      }
      isGifSizeValid(file)
        .then((resut) => {
          if (resut) {
            reject(new Error(t('common.gifSpecsError')));
          }
          resolve(uploadGif(file));
        })
        .catch((err) => {
          reject(new Error(t('common.gifSpecsError')));
        });
    } else {
      throw new Error(t('common.fileTypeError'));
    }
  });
};

const checkFileSize = (file: File, type: AllowedArtifactTypes) => {
  const { t } = useAppI18n()
  switch (type) {
    // unfold特殊处理：50KB，宽高比：4:1
    case AllowedArtifactTypes.IMAGE:
      return file.size > 50 * 1024;
    case AllowedArtifactTypes.GIF:
      return file.size > 50 * 1024;
    default:
      throw new Error(t('common.fileTypeError'));
  }
};
const isGifSizeValid = async (file: File) => {
  const gif = await getImageDimensions(file);
  return !(gif.width === defaultImageSize.width && gif.height === defaultImageSize.height);
};
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};


export interface GetOssTokenParam {
  //作品类型 0:静态图 1:动图 2:涂鸦
  type: number;
}



export enum AllowedArtifactTypes {
  IMAGE = 0, //图片
  GIF = 1, //GIF
  DOODLE = 2, //GIF
}

export interface FileResponse {
  fileUrl: string;
  fileSize: number;
}

export interface UploadImageResponse {
  fileUrl: string;
  fileSize: number;
  binFileUrl: string;
  binSize: number;
}
