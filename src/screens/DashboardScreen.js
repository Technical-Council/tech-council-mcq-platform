import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform,
  Image
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('ongoing');
  const [isSidebarVisible, setIsSidebarVisible] = useState(Platform.OS === 'web'); 
  
  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    branch: 'Loading...',
    avatarUrl: null
  });

  const [tests, setTests] = useState({
    ongoing: [],
    upcoming: []
  });

  // Cloud URL & Tests Fetch Logic
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          name: user.user_metadata?.full_name || 'Student',
          branch: user.user_metadata?.branch || 'Tech Council',
          avatarUrl: user.user_metadata?.avatarUrl || null 
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
          upcoming: scheduledTests || []
        });
      } catch (error) {
        console.error("Error fetching tests:", error.message);
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
      alert("Error logging out: " + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobBottom} />

      {/* TOP NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.logoRow}>

          {/* Council Logo - Cube replaced with image */}
          <Image
            source={require('../../assests/favicon.png')}
            style={styles.logo}
          />

          <View style={styles.headerTextContainer}>
            <Text style={styles.brandTitle}>TECH COUNCIL</Text>
            <Text style={styles.brandSubtitle}>MCQ PLATFORM</Text>
          </View>
        </View>

        <View style={styles.navUserSection}>
          <View style={styles.navAvatar}>
            {userProfile.avatarUrl ? (
              <Image 
                source={{ uri: userProfile.avatarUrl }} 
                style={styles.navAvatarImage} 
              />
            ) : (
              <Feather name="user" size={18} color="#6B7280" />
            )}
          </View>

          <Text style={styles.navUserName}>{userProfile.name}</Text>
          
          <TouchableOpacity 
            style={styles.hamburgerBtn}
            onPress={() => setIsSidebarVisible(!isSidebarVisible)}
          >
            <Feather name="menu" size={24} color="#16A34A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN LAYOUT */}
      <View style={styles.bodyLayout}>
        
        {/* LEFT MAIN CONTENT */}
        <View style={styles.mainContent}>
          <Text style={styles.pageTitle}>User Dashboard</Text>

          <View style={styles.tabWrapper}>
            <TouchableOpacity 
              style={[
                styles.tabBtn, 
                activeTab === 'ongoing' && styles.activeTabBtn
              ]}
              onPress={() => setActiveTab('ongoing')}
            >
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'ongoing' && styles.activeTabText
                ]}
              >
                Ongoing Tests
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabBtn, 
                activeTab === 'upcoming' && styles.activeTabBtn
              ]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'upcoming' && styles.activeTabText
                ]}
              >
                Upcoming Tests
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.testListCard}>
            <Text style={styles.listHeaderTitle}>
              {activeTab === 'ongoing' ? 'Live Now' : 'Scheduled Tests'}
            </Text>
            
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={styles.scrollArea}
            >
              {tests[activeTab].length > 0 ? (
                tests[activeTab].map((test) => (
                  <View key={test.id} style={styles.testItemCard}>
                    
                    <View style={styles.testItemInfo}>
                      <Text style={styles.testItemTitle}>
                        {test.title}
                      </Text>

                      <Text style={styles.testItemDetails}>
                        Duration: {test.duration_minutes} mins
                      </Text>

                      {test.description && (
                        <Text 
                          style={[
                            styles.testItemDetails, 
                            { 
                              marginTop: 4, 
                              color: '#6B7280', 
                              fontSize: 13 
                            }
                          ]}
                        >
                          {test.description}
                        </Text>
                      )}
                    </View>

                    {/* UPDATED: Navigation logic added here */}
                    <TouchableOpacity 
                      style={styles.testActionBtn}
                      onPress={() => {
                        if (activeTab === 'ongoing') {
                          navigation.navigate(
                            'TestInstructions', 
                            { test }
                          );
                        } else {
                          alert(
                            `This test is scheduled. Check back later to start.`
                          );
                        }
                      }}
                    >
                      <Text style={styles.testActionBtnText}>
                        {activeTab === 'ongoing' 
                          ? 'Start Test' 
                          : 'View Details'}
                      </Text>
                    </TouchableOpacity>

                  </View>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Feather 
                    name="inbox" 
                    size={48} 
                    color="#D1D5DB" 
                  />

                  <Text style={styles.emptyStateText}>
                    No {activeTab} tests available right now.
                  </Text>

                  <Text style={styles.emptyStateSubtext}>
                    Tests created by the Admin will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* RIGHT SIDEBAR */}
        {isSidebarVisible && (
          <View style={styles.sidebar}>
            
            <View style={styles.profileCard}>
              <TouchableOpacity 
                style={styles.profileAvatarLarge} 
                onPress={() => navigation.navigate('Settings')}
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
              
              <Text style={styles.profileName}>
                {userProfile.name}
              </Text>

              <Text style={styles.profileBranch}>
                {userProfile.branch}
              </Text>
              
              <TouchableOpacity 
                style={styles.editProfileBtn} 
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.editProfileText}>
                  Edit Profile Details
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.logoutBtn} 
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

  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB', 
    position: 'relative' 
  },

  bgBlobTopRight: { 
    position: 'absolute', 
    top: -100, 
    right: 200, 
    width: 400, 
    height: 400, 
    backgroundColor: '#D1FAE5', 
    borderRadius: 200, 
    opacity: 0.6 
  },

  bgBlobBottom: { 
    position: 'absolute', 
    bottom: -150, 
    left: -50, 
    width: 300, 
    height: 300, 
    backgroundColor: '#D1FAE5', 
    borderRadius: 150, 
    opacity: 0.5 
  },
  
  navbar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 30, 
    paddingVertical: 16, 
    zIndex: 10 
  },

  logoRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },

  // Council Logo
  logo: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },

  headerTextContainer: { 
    marginLeft: 12 
  },

  brandTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#111827' 
  },

  brandSubtitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#111827' 
  },
  
  navUserSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 50, 
    ...Platform.select({ 
      web: { 
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
      }, 
      default: { 
        elevation: 2 
      } 
    }) 
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
    overflow: 'hidden' 
  },

  navAvatarImage: { 
    width: '100%', 
    height: '100%' 
  },

  navUserName: { 
    marginHorizontal: 12, 
    fontWeight: '600', 
    color: '#111827', 
    fontSize: 14 
  },
  
  hamburgerBtn: { 
    padding: 8, 
    borderRadius: 6 
  },
  
  bodyLayout: { 
    flex: 1, 
    flexDirection: Platform.OS === 'web' ? 'row' : 'column', 
    paddingHorizontal: 30, 
    paddingBottom: 30, 
    maxWidth: 1400, 
    width: '100%', 
    alignSelf: 'center', 
    zIndex: 10 
  },

  mainContent: { 
    flex: 1, 
    marginRight: Platform.OS === 'web' ? 40 : 0 
  },

  pageTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginBottom: 20 
  },
  
  tabWrapper: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    ...Platform.select({ 
      web: { 
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
      }, 
      default: { 
        elevation: 2 
      } 
    }) 
  },

  tabBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: 'center', 
    borderRadius: 10 
  },

  activeTabBtn: { 
    backgroundColor: '#16A34A', 
    ...Platform.select({ 
      web: { 
        boxShadow: '0 4px 15px rgba(22, 163, 74, 0.4)' 
      }, 
      default: { 
        elevation: 4 
      } 
    }) 
  },

  tabText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#6B7280' 
  },

  activeTabText: { 
    color: '#FFFFFF' 
  },
  
  testListCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 24, 
    marginTop: -8, 
    paddingTop: 40, 
    flex: 1, 
    ...Platform.select({ 
      web: { 
        boxShadow: '0 10px 40px rgba(0,0,0,0.06)' 
      }, 
      default: { 
        elevation: 3 
      } 
    }), 
    zIndex: -1 
  },

  listHeaderTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 20 
  },

  scrollArea: { 
    flex: 1 
  },
  
  // Naye Test Item Styles
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
    borderColor: '#F3F4F6' 
  },

  testItemInfo: { 
    flex: 1, 
    paddingRight: 20 
  },

  testItemTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#111827', 
    marginBottom: 6 
  },

  testItemDetails: { 
    fontSize: 14, 
    color: '#4B5563', 
    fontWeight: '500' 
  },

  testActionBtn: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1.5, 
    borderColor: '#16A34A', 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 24 
  },

  testActionBtnText: { 
    color: '#16A34A', 
    fontWeight: 'bold', 
    fontSize: 14 
  },

  emptyStateContainer: { 
    paddingVertical: 60, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  emptyStateText: { 
    color: '#4B5563', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 16 
  },

  emptyStateSubtext: { 
    color: '#9CA3AF', 
    fontSize: 14, 
    marginTop: 8 
  },
  
  sidebar: { 
    width: Platform.OS === 'web' ? 320 : '100%', 
    marginTop: Platform.OS === 'web' ? 0 : 40 
  },

  profileCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 24, 
    alignItems: 'center', 
    marginBottom: 24, 
    ...Platform.select({ 
      web: { 
        boxShadow: '0 10px 40px rgba(0,0,0,0.06)' 
      }, 
      default: { 
        elevation: 3 
      } 
    }) 
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
    overflow: 'hidden' 
  },

  avatarImage: { 
    width: '100%', 
    height: '100%' 
  },
  
  profileName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#111827', 
    marginBottom: 4 
  },

  profileBranch: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 16 
  },

  editProfileBtn: { 
    borderWidth: 1, 
    borderColor: '#16A34A', 
    borderRadius: 8, 
    paddingVertical: 8, 
    paddingHorizontal: 20 
  },

  editProfileText: { 
    color: '#16A34A', 
    fontWeight: '600' 
  },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FEF2F2', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderRadius: 12 
  },

  logoutText: { 
    marginLeft: 12, 
    color: '#DC2626', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

});