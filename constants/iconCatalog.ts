import { ImageSourcePropType } from 'react-native';

export type IconKey = 'sunnyBadge' | 'talkBadge' | 'guideBadge' | 'hugIcon';

type IconPreset = {
  source: ImageSourcePropType;
  label: string;
};

export const ICON_CATALOG: Record<IconKey, IconPreset> = {
  sunnyBadge: {
    source: require('../assets/icons/btnD_com.png'),
    label: '노란 배지',
  },
  talkBadge: {
    source: require('../assets/icons/kakao_login_medium_narrow.png'),
    label: '말풍선 배지',
  },
  guideBadge: {
    source: require('../assets/icons/btnD_com.png'),
    label: '안전 배지',
  },
  hugIcon: {
    source: require('../assets/icons/hug_icon_new.png'),
    label: '포옹 아이콘',
  },
};

export const ICON_OPTIONS: { key: IconKey; label: string }[] = Object.keys(ICON_CATALOG).map(
  (key) => ({
    key: key as IconKey,
    label: ICON_CATALOG[key as IconKey].label,
  }),
);

