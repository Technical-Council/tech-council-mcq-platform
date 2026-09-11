import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();

  // Mobile breakpoint
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState('ongoing');

  // Desktop par sidebar visible, mobile par hidden
  const [isSidebarVisible, setIsSidebarVisible] = useState(!isMobile);

  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    branch: 'Loading...',
    avatarUrl: null,
  });

  const [tests, setTests] = useState({
    ongoing: [],
    upcoming: [],
  });

  // Mobile/desktop change hone par sidebar state adjust karo
  useEffect(() => {
    setIsSidebarVisible(!isMobile);
  }, [isMobile]);

  // Cloud URL & Tests Fetch Logic
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserProfile({
          name: user.user_metadata?.full_name || 'Student',
          branch: user.user_metadata?.branch || 'Tech Council',
          avatarUrl: user.user_metadata?.avatarUrl || null,
        });
      }
    };

    // Database se Live aur Scheduled tests lana
    const fetchTests = async () => {
      try {
        // Live tests (Ongoing)
        const { data: liveTests, error: liveError } = await supabase
          .from('tests')
          .select('*')
          .eq('status', 'live')
          .order('created_at', { ascending: false });

        // Scheduled tests (Upcoming)
        const { data: scheduledTests, error: schedError } = await supabase
          .from('tests')
          .select('*')
          .eq('status', 'scheduled')
          .order('created_at', { ascending: false });

        if (liveError) throw liveError;
        if (schedError) throw schedError;

        setTests({
          ongoing: liveTests || [],
          upcoming: scheduledTests || [],
        });
      } catch (error) {
        console.error('Error fetching tests:', error.message);
      }
    };

    fetchUser();
    fetchTests();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (error) {
      alert('Error logging out: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background blobs */}
      <View
        style={[
          styles.bgBlobTopRight,
          isMobile && styles.bgBlobTopRightMobile,
        ]}
      />

      <View
        style={[
          styles.bgBlobBottom,
          isMobile && styles.bgBlobBottomMobile,
        ]}
      />

      {/* =========================
          TOP NAVBAR
      ========================== */}
      <View
        style={[
          styles.navbar,
          isMobile && styles.navbarMobile,
        ]}
      >
        <View
          style={[
            styles.logoRow,
            isMobile && styles.logoRowMobile,
          ]}
        >
          {/* Council Logo */}
          <Image
            source={require('../../assests/favicon.png')}
            style={[
              styles.logo,
              isMobile && styles.logoMobile,
            ]}
          />

          <View
            style={[
              styles.headerTextContainer,
              isMobile && styles.headerTextContainerMobile,
            ]}
          >
            <Text
              style={[
                styles.brandTitle,
                isMobile && styles.brandTitleMobile,
              ]}
              numberOfLines={1}
            >
              TECH COUNCIL
            </Text>

            <Text
              style={[
                styles.brandSubtitle,
                isMobile && styles.brandSubtitleMobile,
              ]}
              numberOfLines={1}
            >
              MCQ PLATFORM
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.navUserSection,
            isMobile && styles.navUserSectionMobile,
          ]}
        >
          <View style={styles.navAvatar}>
            {userProfile.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                style={styles.navAvatarImage}
              />
            ) : (
              <Feather
                name="user"
                size={18}
                color="#6B7280"
              />
            )}
          </View>

          {!isMobile && (
            <Text
              style={styles.navUserName}
              numberOfLines={1}
            >
              {userProfile.name}
            </Text>
          )}

          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() =>
              setIsSidebarVisible(!isSidebarVisible)
            }
          >
            <Feather
              name="menu"
              size={24}
              color="#16A34A"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* =========================
          MAIN LAYOUT
      ========================== */}
      <View
        style={[
          styles.bodyLayout,
          isMobile && styles.bodyLayoutMobile,
        ]}
      >
        {/* =========================
            LEFT MAIN CONTENT
        ========================== */}
        <View
          style={[
            styles.mainContent,
            isMobile && styles.mainContentMobile,
          ]}
        >
          <Text
            style={[
              styles.pageTitle,
              isMobile && styles.pageTitleMobile,
            ]}
          >
            User Dashboard
          </Text>

          {/* =========================
              TABS
          ========================== */}
          <View
            style={[
              styles.tabWrapper,
              isMobile && styles.tabWrapperMobile,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'ongoing' && styles.activeTabBtn,
              ]}
              onPress={() => setActiveTab('ongoing')}
            >
              <Text
                style={[
                  styles.tabText,
                  isMobile && styles.tabTextMobile,
                  activeTab === 'ongoing' &&
                    styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Ongoing Tests
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'upcoming' && styles.activeTabBtn,
              ]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text
                style={[
                  styles.tabText,
                  isMobile && styles.tabTextMobile,
                  activeTab === 'upcoming' &&
                    styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Upcoming Tests
              </Text>
            </TouchableOpacity>
          </View>

          {/* =========================
              TEST LIST
          ========================== */}
          <View
            style={[
              styles.testListCard,
              isMobile && styles.testListCardMobile,
            ]}
          >
            <Text
              style={[
                styles.listHeaderTitle,
                isMobile && styles.listHeaderTitleMobile,
              ]}
            >
              {activeTab === 'ongoing'
                ? 'Live Now'
                : 'Scheduled Tests'}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollArea}
              contentContainerStyle={
                isMobile
                  ? styles.scrollContentMobile
                  : styles.scrollContent
              }
            >
              {tests[activeTab].length > 0 ? (
                tests[activeTab].map((test) => (
                  <View
                    key={test.id}
                    style={[
                      styles.testItemCard,
                      isMobile && styles.testItemCardMobile,
                    ]}
                  >
                    {/* TEST INFORMATION */}
                    <View
                      style={[
                        styles.testItemInfo,
                        isMobile &&
                          styles.testItemInfoMobile,
                      ]}
                    >
                      <Text
                        style={[
                          styles.testItemTitle,
                          isMobile &&
                            styles.testItemTitleMobile,
                        ]}
                      >
                        {test.title}
                      </Text>

                      <Text
                        style={[
                          styles.testItemDetails,
                          isMobile &&
                            styles.testItemDetailsMobile,
                        ]}
                      >
                        Duration: {test.duration_minutes} mins
                      </Text>

                      {test.description && (
                        <Text
                          style={[
                            styles.testItemDetails,
                            styles.descriptionText,
                            isMobile &&
                              styles.descriptionTextMobile,
                          ]}
                        >
                          {test.description}
                        </Text>
                      )}
                    </View>

                    {/* ACTION BUTTON */}
                    <TouchableOpacity
                      style={[
                        styles.testActionBtn,
                        isMobile &&
                          styles.testActionBtnMobile,
                      ]}
                      onPress={() => {
                        if (activeTab === 'ongoing') {
                          navigation.navigate(
                            'TestInstructions',
                            { test }
                          );
                        } else {
                          alert(
                            'This test is scheduled. Check back later to start.'
                          );
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.testActionBtnText,
                          isMobile &&
                            styles.testActionBtnTextMobile,
                        ]}
                      >
                        {activeTab === 'ongoing'
                          ? 'Start Test'
                          : 'View Details'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.emptyStateContainer,
                    isMobile &&
                      styles.emptyStateContainerMobile,
                  ]}
                >
                  <Feather
                    name="inbox"
                    size={48}
                    color="#D1D5DB"
                  />

                  <Text
                    style={[
                      styles.emptyStateText,
                      isMobile &&
                        styles.emptyStateTextMobile,
                    ]}
                  >
                    No {activeTab} tests available right now.
                  </Text>

                  <Text
                    style={[
                      styles.emptyStateSubtext,
                      isMobile &&
                        styles.emptyStateSubtextMobile,
                    ]}
                  >
                    Tests created by the Admin will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* =========================
            RIGHT SIDEBAR
        ========================== */}
        {isSidebarVisible && (
          <View
            style={[
              styles.sidebar,
              isMobile && styles.sidebarMobile,
            ]}
          >
            {/* PROFILE CARD */}
            <View
              style={[
                styles.profileCard,
                isMobile && styles.profileCardMobile,
              ]}
            >
              <TouchableOpacity
                style={styles.profileAvatarLarge}
                onPress={() =>
                  navigation.navigate('Settings')
                }
              >
                {userProfile.avatarUrl ? (
                  <Image
                    source={{ uri: userProfile.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Feather
                    name="camera"
                    size={32}
                    color="#9CA3AF"
                  />
                )}
              </TouchableOpacity>

              <Text
                style={[
                  styles.profileName,
                  isMobile && styles.profileNameMobile,
                ]}
                numberOfLines={1}
              >
                {userProfile.name}
              </Text>

              <Text
                style={[
                  styles.profileBranch,
                  isMobile && styles.profileBranchMobile,
                ]}
                numberOfLines={2}
              >
                {userProfile.branch}
              </Text>

              <TouchableOpacity
                style={[
                  styles.editProfileBtn,
                  isMobile && styles.editProfileBtnMobile,
                ]}
                onPress={() =>
                  navigation.navigate('Settings')
                }
              >
                <Text
                  style={styles.editProfileText}
                >
                  Edit Profile Details
                </Text>
              </TouchableOpacity>
            </View>

            {/* LOGOUT */}
            <TouchableOpacity
              style={[
                styles.logoutBtn,
                isMobile && styles.logoutBtnMobile,
              ]}
              onPress={handleLogout}
            >
              <Feather
                name="log-out"
                size={20}
                color="#DC2626"
              />

              <Text style={styles.logoutText}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =========================
     MAIN CONTAINER
  ========================== */

  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
    overflow: 'hidden',
  },

  /* =========================
     BACKGROUND BLOBS
  ========================== */

  bgBlobTopRight: {
    position: 'absolute',
    top: -100,
    right: 200,
    width: 400,
    height: 400,
    backgroundColor: '#D1FAE5',
    borderRadius: 200,
    opacity: 0.6,
  },

  bgBlobTopRightMobile: {
    top: -120,
    right: -170,
    width: 360,
    height: 360,
    borderRadius: 180,
  },

  bgBlobBottom: {
    position: 'absolute',
    bottom: -150,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: '#D1FAE5',
    borderRadius: 150,
    opacity: 0.5,
  },

  bgBlobBottomMobile: {
    bottom: -130,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },

  /* =========================
     NAVBAR
  ========================== */

  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 16,
    zIndex: 10,
    width: '100%',
  },

  navbarMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  logoRowMobile: {
    flex: 1,
    minWidth: 0,
  },

  logo: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
    flexShrink: 0,
  },

  logoMobile: {
    width: 40,
    height: 40,
  },

  headerTextContainer: {
    marginLeft: 12,
    flexShrink: 1,
    minWidth: 0,
  },

  headerTextContainerMobile: {
    marginLeft: 8,
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },

  brandTitleMobile: {
    fontSize: 16,
  },

  brandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  brandSubtitleMobile: {
    fontSize: 10,
  },

  /* =========================
     USER NAV
  ========================== */

  navUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
    flexShrink: 0,

    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },

  navUserSectionMobile: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 8,
  },

  navAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    flexShrink: 0,
  },

  navAvatarImage: {
    width: '100%',
    height: '100%',
  },

  navUserName: {
    marginHorizontal: 12,
    fontWeight: '600',
    color: '#111827',
    fontSize: 14,
    maxWidth: 120,
  },

  hamburgerBtn: {
    padding: 8,
    borderRadius: 6,
    flexShrink: 0,
  },

  /* =========================
     BODY
  ========================== */

  bodyLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingBottom: 30,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    zIndex: 10,
    minWidth: 0,
  },

  bodyLayoutMobile: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
    maxWidth: '100%',
  },

  /* =========================
     MAIN CONTENT
  ========================== */

  mainContent: {
    flex: 1,
    marginRight: 40,
    minWidth: 0,
  },

  mainContentMobile: {
    width: '100%',
    marginRight: 0,
    flex: 1,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },

  pageTitleMobile: {
    fontSize: 25,
    marginBottom: 16,
  },

  /* =========================
     TABS
  ========================== */

  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',

    ...Platform.select({
      web: {
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },

  tabWrapperMobile: {
    borderRadius: 12,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minWidth: 0,
  },

  activeTabBtn: {
    backgroundColor: '#16A34A',

    ...Platform.select({
      web: {
        boxShadow:
          '0 4px 15px rgba(22, 163, 74, 0.4)',
      },
      default: {
        elevation: 4,
      },
    }),
  },

  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  tabTextMobile: {
    fontSize: 14,
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  /* =========================
     TEST LIST CARD
  ========================== */

  testListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: -8,
    paddingTop: 40,
    flex: 1,
    minWidth: 0,

    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
      },
      default: {
        elevation: 3,
      },
    }),
  },

  testListCardMobile: {
    marginTop: -6,
    padding: 16,
    paddingTop: 30,
    borderRadius: 16,
    minHeight: 300,
  },

  listHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },

  listHeaderTitleMobile: {
    fontSize: 21,
    marginBottom: 16,
  },

  scrollArea: {
    flex: 1,
    width: '100%',
    minWidth: 0,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  scrollContentMobile: {
    paddingBottom: 20,
  },

  /* =========================
     TEST ITEM
  ========================== */

  testItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#16A34A',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    width: '100%',
    minWidth: 0,
  },

  testItemCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
  },

  testItemInfo: {
    flex: 1,
    paddingRight: 20,
    minWidth: 0,
  },

  testItemInfoMobile: {
    width: '100%',
    paddingRight: 0,
    marginBottom: 14,
  },

  testItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    flexShrink: 1,
  },

  testItemTitleMobile: {
    fontSize: 17,
    lineHeight: 23,
  },

  testItemDetails: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    flexShrink: 1,
  },

  testItemDetailsMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  descriptionText: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
  },

  descriptionTextMobile: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* =========================
     TEST ACTION BUTTON
  ========================== */

  testActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  testActionBtnMobile: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  testActionBtnText: {
    color: '#16A34A',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },

  testActionBtnTextMobile: {
    fontSize: 15,
  },

  /* =========================
     EMPTY STATE
  ========================== */

  emptyStateContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  emptyStateContainerMobile: {
    paddingVertical: 50,
  },

  emptyStateText: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },

  emptyStateTextMobile: {
    fontSize: 16,
  },

  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  emptyStateSubtextMobile: {
    fontSize: 13,
  },

  /* =========================
     SIDEBAR
  ========================== */

  sidebar: {
    width: 320,
    marginTop: 0,
    flexShrink: 0,
  },

  sidebarMobile: {
    width: '100%',
    marginTop: 16,
    flexShrink: 0,
  },

  /* =========================
     PROFILE CARD
  ========================== */

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,

    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
      },
      default: {
        elevation: 3,
      },
    }),
  },

  profileCardMobile: {
    width: '100%',
    padding: 20,
    marginBottom: 16,
  },

  profileAvatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    maxWidth: '100%',
    textAlign: 'center',
  },

  profileNameMobile: {
    fontSize: 18,
  },

  profileBranch: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },

  profileBranchMobile: {
    fontSize: 14,
  },

  editProfileBtn: {
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    maxWidth: '100%',
  },

  editProfileBtnMobile: {
    width: '100%',
    alignItems: 'center',
  },

  editProfileText: {
    color: '#16A34A',
    fontWeight: '600',
    textAlign: 'center',
  },

  /* =========================
     LOGOUT
  ========================== */

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },

  logoutBtnMobile: {
    paddingVertical: 15,
  },

  logoutText: {
    marginLeft: 12,
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 16,
  },
});