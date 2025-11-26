declare module 'react-native-image-picker' {
  export type Asset = {
    uri?: string;
    fileName?: string;
    type?: string;
  };

  export type ImageLibraryOptions = {
    mediaType?: 'photo' | 'video' | 'mixed';
    selectionLimit?: number;
    quality?: number;
  };

  export type ImagePickerResponse = {
    assets?: Asset[];
    didCancel?: boolean;
    errorCode?: string;
    errorMessage?: string;
  };

  export function launchImageLibrary(
    options: ImageLibraryOptions,
  ): Promise<ImagePickerResponse>;
}

