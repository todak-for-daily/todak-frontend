import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { useAdmin } from '../contexts/AdminContext';
import { ICON_CATALOG, IconKey } from '../constants/iconCatalog';
import { WorkStackParamList } from '../types/workNavigation';

const WorkOrganizationList = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkStackParamList>>();
  const { organizations, members } = useAdmin();

  const groupedMembers = useMemo(() => {
    return organizations.map((org) => {
      const teamMembers = members.filter((m) => m.organizationId === org.id && m.role === '기업 재직자');
      return {
        ...org,
        memberCount: teamMembers.length,
      };
    });
  }, [organizations, members]);

  const handleSelect = (organizationId: number) => {
    navigation.navigate('WorkHome', { organizationId });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>확인할 회사를 골라주세요</Text>
        <Text style={styles.subtitle}>여러 회사를 관리하면, 이곳에서 빠르게 이동할 수 있어요.</Text>

        {groupedMembers.map((org) => {
          const iconKey = (org.companyImageKey || 'hugIcon') as IconKey;
          const iconSource = org.companyImageUrl
            ? { uri: org.companyImageUrl }
            : ICON_CATALOG[iconKey].source;
          return (
            <TouchableOpacity key={org.id} style={styles.card} onPress={() => handleSelect(org.id)}>
              <View style={styles.iconWrap}>
                <Image source={iconSource} style={styles.icon} resizeMode="cover" />
              </View>
              <View style={styles.orgInfoContainer}>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgMeta}>{org.memberCount}명의 근무자</Text>
                <Text style={styles.orgMeta}>관리자: {org.adminName}</Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default WorkOrganizationList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#666',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    width: 40,
    height: 40,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  orgMeta: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: '#888',
    marginLeft: 12,
  },
  orgInfoContainer: {
    flex: 1,
  },
});

