import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { launchImageLibrary, ImageLibraryOptions, Asset } from 'react-native-image-picker';

export type MediaSelection = {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
};

interface ProfilePhotoPickerProps {
  visible: boolean;
  initialUrl?: string;
  initialType?: 'image' | 'video';
  allowedMediaTypes?: ImageLibraryOptions['mediaType'];
  onClose: () => void;
  onSave: (media: MediaSelection) => void;
}

const ProfilePhotoPicker: React.FC<ProfilePhotoPickerProps> = ({
  visible,
  initialUrl,
  initialType = 'image',
  allowedMediaTypes = 'photo',
  onClose,
  onSave,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaSelection | null>(
    initialUrl ? { uri: initialUrl, type: initialType } : null,
  );
  const [isPicking, setIsPicking] = useState(false);
  const mediaLabel =
    allowedMediaTypes === 'video' ? '영상' : allowedMediaTypes === 'mixed' ? '사진/영상' : '사진';

  useEffect(() => {
    if (initialUrl) {
      setSelectedMedia({ uri: initialUrl, type: initialType });
    } else {
      setSelectedMedia(null);
    }
  }, [initialUrl, initialType, visible]);

  const requestGalleryPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      // iOS는 react-native-image-picker가 자동으로 권한을 요청합니다
      return true;
    }

    try {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      // 이미 권한이 있는지 확인
      const checkResult = await PermissionsAndroid.check(permission);
      if (checkResult) {
        console.log('갤러리 권한이 이미 허용되어 있습니다.');
        return true;
      }

      console.log('갤러리 권한 요청 중...', permission);
      // 권한이 없으면 요청
      const granted = await PermissionsAndroid.request(permission, {
        title: '갤러리 권한',
        message: '프로필 사진을 선택하기 위해 갤러리 접근 권한이 필요해요.',
        buttonNeutral: '나중에',
        buttonNegative: '취소',
        buttonPositive: '허용',
      });

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('갤러리 권한 요청 결과:', granted, isGranted ? '허용됨' : '거부됨');
      return isGranted;
    } catch (error) {
      console.error('갤러리 권한 요청 실패', error);
      return false;
    }
  };

  const handleGalleryPick = async () => {
    if (isPicking) return;

    try {
      setIsPicking(true);

      // Android의 경우 권한 확인 및 요청
      if (Platform.OS === 'android') {
        const hasPermission = await requestGalleryPermission();
        if (!hasPermission) {
          Alert.alert(
            '권한이 필요해요',
            '갤러리에서 사진을 선택하려면 권한이 필요해요. 설정에서 권한을 허용해 주세요.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '설정 열기',
                onPress: () => {
                  Linking.openSettings().catch(() => {
                    Alert.alert('설정을 열 수 없어요', '기기의 설정 앱에서 직접 권한을 허용해 주세요.');
                  });
                },
              },
            ],
          );
          setIsPicking(false);
          return;
        }
      }

      const options: ImageLibraryOptions = {
        mediaType: allowedMediaTypes,
        selectionLimit: 1,
        quality: 0.8,
      };
      
      console.log('이미지 라이브러리 열기 시도...');
      const result = await launchImageLibrary(options);
      
      console.log('이미지 선택 결과:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assetsCount: result.assets?.length || 0,
      });
      
      if (result.didCancel) {
        console.log('사용자가 이미지 선택을 취소했습니다.');
        setIsPicking(false);
        return;
      }
      
      if (result.errorCode) {
        console.error('이미지 선택 에러:', result.errorCode, result.errorMessage);
        Alert.alert(
          '사진을 불러올 수 없어요',
          result.errorMessage || '에뮬레이터에 사진이 없거나 권한이 필요할 수 있어요.',
        );
        setIsPicking(false);
        return;
      }
      
      const asset: Asset | undefined = result.assets && result.assets[0];
      if (asset?.uri) {
        console.log('미디어 선택 성공:', {
          uri: asset.uri,
          type: asset.type,
        });
        const selectedType: 'image' | 'video' =
          asset.type?.startsWith('video') ? 'video' : 'image';
        setSelectedMedia({
          uri: asset.uri,
          type: selectedType,
          fileName: asset.fileName || undefined,
        });
      } else {
        console.warn('선택된 이미지가 없습니다.');
        Alert.alert(
          '사진을 불러오지 못했어요',
          '에뮬레이터에 사진이 있는지 확인하거나, 실제 기기에서 시도해 주세요.',
        );
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        '사진을 선택할 수 없어요',
        '권한을 확인하거나 에뮬레이터에 사진이 있는지 확인해 주세요.',
      );
    } finally {
      setIsPicking(false);
    }
  };

  const handleSave = () => {
    if (!selectedMedia) {
      Alert.alert('사진이나 영상을 선택해 주세요');
      return;
    }
    onSave(selectedMedia);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>프로필 {mediaLabel} 선택</Text>
          <Text style={styles.description}>
            갤러리 권한을 허용하면 내 {mediaLabel}을 선택할 수 있어요.
          </Text>
          <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryPick} disabled={isPicking}>
            <Text style={styles.galleryButtonText}>
              {isPicking ? '미디어 불러오는 중...' : `📷 ${mediaLabel} 선택하기`}
            </Text>
          </TouchableOpacity>

          {selectedMedia ? (
            selectedMedia.type === 'image' ? (
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.videoPreview}>
                <FeatherIcon name="video" size={32} color="#fff" />
                <Text style={styles.videoPreviewText}>영상이 선택되었어요</Text>
                {selectedMedia.fileName ? (
                  <Text style={styles.videoPreviewFile}>{selectedMedia.fileName}</Text>
                ) : null}
              </View>
            )
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>선택된 {mediaLabel}이 없어요</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !selectedMedia && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedMedia}
            >
              <Text style={styles.primaryButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProfilePhotoPicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  galleryButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  galleryButtonText: {
    fontWeight: '700',
    color: '#000',
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  previewPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF8E1',
  },
  previewPlaceholderText: {
    color: '#8A6D00',
    fontWeight: '600',
  },
  videoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  videoPreviewText: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  videoPreviewFile: {
    color: '#D1D5DB',
    marginTop: 4,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
    color: '#555',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#000',
  },
});

